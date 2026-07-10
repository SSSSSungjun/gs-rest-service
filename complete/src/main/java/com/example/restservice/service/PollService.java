package com.example.restservice.service;

import com.example.restservice.entity.PollOption;
import com.example.restservice.entity.PollVote;
import com.example.restservice.repository.PollOptionRepository;
import com.example.restservice.repository.PollVoteRepository;
import com.example.restservice.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PollService {

    private final PostRepository postRepository;
    private final PollOptionRepository pollOptionRepository;
    private final PollVoteRepository pollVoteRepository;

    @Transactional
    public void vote(Long postId, Long optionId, String sessionId) {
        postRepository.findWithLockById(postId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 글입니다."));
        PollOption pollOption = pollOptionRepository.findByIdAndPostId(optionId, postId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 투표 선택지입니다."));

        pollVoteRepository.findByPostIdAndOwnerSessionId(postId, sessionId)
                .ifPresentOrElse(
                        pollVote -> pollVote.changeOption(pollOption),
                        () -> pollVoteRepository.save(PollVote.builder()
                                .post(pollOption.getPost())
                                .pollOption(pollOption)
                                .ownerSessionId(sessionId)
                                .build())
                );
    }
}
