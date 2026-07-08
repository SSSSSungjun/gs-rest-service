package com.example.restservice.repository;

import com.example.restservice.entity.PostLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PostLikeRepository extends JpaRepository<PostLike, Long> {
    Optional<PostLike> findByPostIdAndOwnerSessionId(Long postId, String ownerSessionId);

    @Query("""
            select like.post.id as targetId, count(like.id) as likeCount
            from PostLike like
            where like.post.id in :postIds
            group by like.post.id
            """)
    List<LikeCountProjection> countByPostIds(@Param("postIds") Collection<Long> postIds);

    @Query("""
            select like.post.id
            from PostLike like
            where like.ownerSessionId = :ownerSessionId and like.post.id in :postIds
            """)
    List<Long> findLikedPostIds(
            @Param("ownerSessionId") String ownerSessionId,
            @Param("postIds") Collection<Long> postIds
    );

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    void deleteByPostId(Long postId);
}
