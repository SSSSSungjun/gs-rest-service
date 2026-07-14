package com.example.restservice.service;

import com.example.restservice.dto.response.BoardActivityResponseDto;
import com.example.restservice.event.BoardActivityCreatedEvent;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.Map;
import java.util.OptionalLong;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class BoardActivityStreamService {
    private static final int MAX_REPLAY_EVENTS = 200;

    private final Map<String, Subscriber> subscribers = new ConcurrentHashMap<>();
    private final Deque<PublishedActivity> history = new ArrayDeque<>();
    private final AtomicLong sequence = new AtomicLong();
    private final String instanceId = UUID.randomUUID().toString();

    public SseEmitter subscribe(String sessionId, String lastEventId) {
        SseEmitter emitter = new SseEmitter(0L);
        String subscriberId = UUID.randomUUID().toString();
        Subscriber subscriber = new Subscriber(subscriberId, sessionId, emitter);
        subscribers.put(subscriberId, subscriber);

        emitter.onCompletion(() -> subscribers.remove(subscriberId));
        emitter.onTimeout(() -> subscribers.remove(subscriberId));
        emitter.onError(error -> subscribers.remove(subscriberId));

        sendConnected(subscriber);
        replayMissedActivities(subscriber, lastEventId);
        return emitter;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void publishAfterCommit(BoardActivityCreatedEvent event) {
        long nextSequence = sequence.incrementAndGet();
        String eventId = instanceId + ":" + nextSequence;
        BoardActivityResponseDto response = new BoardActivityResponseDto(
                eventId,
                event.type().name(),
                event.postId(),
                System.currentTimeMillis()
        );
        PublishedActivity activity = new PublishedActivity(
                event.ownerSessionId(),
                nextSequence,
                response
        );

        synchronized (history) {
            history.addLast(activity);
            while (history.size() > MAX_REPLAY_EVENTS) {
                history.removeFirst();
            }
        }

        subscribers.values().forEach(subscriber -> sendActivity(subscriber, activity));
    }

    @Scheduled(fixedRateString = "${app.activity.heartbeat-ms:25000}")
    public void sendHeartbeat() {
        subscribers.values().forEach(subscriber -> {
            try {
                subscriber.emitter().send(SseEmitter.event().comment("heartbeat"));
            } catch (IOException | IllegalStateException exception) {
                subscribers.remove(subscriber.id());
            }
        });
    }

    private void replayMissedActivities(Subscriber subscriber, String lastEventId) {
        OptionalLong lastSequence = parseLastSequence(lastEventId);
        if (lastSequence.isEmpty()) {
            return;
        }

        ArrayList<PublishedActivity> snapshot;
        synchronized (history) {
            snapshot = new ArrayList<>(history);
        }
        snapshot.stream()
                .filter(activity -> activity.sequence() > lastSequence.getAsLong())
                .forEach(activity -> sendActivity(subscriber, activity));
    }

    private OptionalLong parseLastSequence(String lastEventId) {
        if (lastEventId == null || !lastEventId.startsWith(instanceId + ":")) {
            return OptionalLong.empty();
        }
        try {
            return OptionalLong.of(Long.parseLong(lastEventId.substring(instanceId.length() + 1)));
        } catch (NumberFormatException exception) {
            return OptionalLong.empty();
        }
    }

    private void sendConnected(Subscriber subscriber) {
        try {
            subscriber.emitter().send(SseEmitter.event()
                    .name("connected")
                    .reconnectTime(3000)
                    .data("connected"));
        } catch (IOException | IllegalStateException exception) {
            subscribers.remove(subscriber.id());
        }
    }

    private void sendActivity(Subscriber subscriber, PublishedActivity activity) {
        if (activity.ownerSessionId().equals(subscriber.sessionId())) {
            return;
        }
        try {
            subscriber.emitter().send(SseEmitter.event()
                    .id(activity.response().id())
                    .name("activity")
                    .data(activity.response()));
        } catch (IOException | IllegalStateException exception) {
            subscribers.remove(subscriber.id());
        }
    }

    private record Subscriber(String id, String sessionId, SseEmitter emitter) {
    }

    private record PublishedActivity(
            String ownerSessionId,
            long sequence,
            BoardActivityResponseDto response
    ) {
    }
}
