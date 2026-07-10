package com.example.restservice.repository;

import com.example.restservice.entity.PollVote;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PollVoteRepository extends JpaRepository<PollVote, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<PollVote> findByPostIdAndOwnerSessionId(Long postId, String ownerSessionId);

    @Query("""
            select pollVote.pollOption.id as targetId, count(pollVote.id) as likeCount
            from PollVote pollVote
            where pollVote.post.id in :postIds
            group by pollVote.pollOption.id
            """)
    List<LikeCountProjection> countByPostIds(@Param("postIds") Collection<Long> postIds);

    @Query("""
            select pollVote.pollOption.id
            from PollVote pollVote
            where pollVote.ownerSessionId = :ownerSessionId and pollVote.post.id in :postIds
            """)
    List<Long> findVotedOptionIds(
            @Param("ownerSessionId") String ownerSessionId,
            @Param("postIds") Collection<Long> postIds
    );

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    void deleteByPostId(Long postId);
}
