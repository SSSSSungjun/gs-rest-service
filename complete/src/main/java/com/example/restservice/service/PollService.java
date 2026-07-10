package com.example.restservice.service;

import com.example.restservice.entity.PollOption;
import com.example.restservice.entity.PollVote;
import com.example.restservice.repository.PollOptionRepository;
import com.example.restservice.repository.PollVoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PollService {

    private final PollOptionRepository pollOptionRepository;
    private final PollVoteRepository pollVoteRepository;

    @Transactional
    public void vote(Long postId, Long optionId, String sessionId) {
        PollOption pollOption = pollOptionRepository.findByIdAndPostId(optionId, postId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 투표 선택지입니다."));

        try {
            pollVoteRepository.findByPostIdAndOwnerSessionId(postId, sessionId)
                    .ifPresentOrElse(
                            pollVote -> pollVote.changeOption(pollOption),
                            () -> pollVoteRepository.save(PollVote.builder()
                                    .post(pollOption.getPost())
                                    .pollOption(pollOption)
                                    .ownerSessionId(sessionId)
                                    .build())
                    );
        } catch (DataIntegrityViolationException exception) {
            PollVote pollVote = pollVoteRepository.findByPostIdAndOwnerSessionId(postId, sessionId)
                    .orElseThrow(() -> exception);
            pollVote.changeOption(pollOption);
        }
    }
}
