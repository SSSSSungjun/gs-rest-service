package com.example.restservice.repository;

import com.example.restservice.entity.CommentLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface CommentLikeRepository extends JpaRepository<CommentLike, Long> {
    Optional<CommentLike> findByCommentIdAndOwnerSessionId(Long commentId, String ownerSessionId);

    @Query("""
            select commentLike.comment.id as targetId, count(commentLike.id) as likeCount
            from CommentLike commentLike
            where commentLike.comment.id in :commentIds
            group by commentLike.comment.id
            """)
    List<LikeCountProjection> countByCommentIds(@Param("commentIds") Collection<Long> commentIds);

    @Query("""
            select commentLike.comment.id
            from CommentLike commentLike
            where commentLike.ownerSessionId = :ownerSessionId and commentLike.comment.id in :commentIds
            """)
    List<Long> findLikedCommentIds(
            @Param("ownerSessionId") String ownerSessionId,
            @Param("commentIds") Collection<Long> commentIds
    );

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    void deleteByCommentId(Long commentId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from CommentLike commentLike where commentLike.comment.post.id = :postId")
    void deleteByPostId(@Param("postId") Long postId);
}
