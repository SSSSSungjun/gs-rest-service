package com.example.restservice.repository;

import com.example.restservice.entity.Comment;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    @Query("""
            select comment
            from Comment comment
            where lower(comment.nickname) like concat('%', :query, '%')
               or lower(comment.content) like concat('%', :query, '%')
            """)
    Page<Comment> search(@Param("query") String query, Pageable pageable);

    @Query(
            value = """
                    select comment
                    from Comment comment
                    left join PostLike postLike on postLike.post = comment.post
                    where lower(comment.nickname) like concat('%', :query, '%')
                       or lower(comment.content) like concat('%', :query, '%')
                    group by comment
                    order by count(postLike.id) desc, comment.createdAt desc
                    """,
            countQuery = """
                    select count(comment)
                    from Comment comment
                    where lower(comment.nickname) like concat('%', :query, '%')
                       or lower(comment.content) like concat('%', :query, '%')
                    """
    )
    Page<Comment> searchPopular(@Param("query") String query, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Comment> findWithLockById(Long id);

    List<Comment> findByParentCommentId(Long parentCommentId);
}
