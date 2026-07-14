package com.example.restservice.repository;

import com.example.restservice.entity.Comment;
import jakarta.persistence.LockModeType;import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import java.util.List;
import java.util.Optional;
public interface CommentRepository extends JpaRepository<Comment, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Comment> findWithLockById(Long id);

    List<Comment> findByParentCommentId(Long parentCommentId);
}