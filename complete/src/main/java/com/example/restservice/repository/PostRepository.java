package com.example.restservice.repository;

import com.example.restservice.entity.Post;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PostRepository extends JpaRepository<Post, Long> {
    //최신 글이 맨 위로 올라오도록
    List<Post> findAllByOrderByCreatedAtDesc();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Post> findWithLockById(Long id);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Post post set post.viewCount = coalesce(post.viewCount, 0) + 1 where post.id = :id")
    int incrementViewCount(@Param("id") Long id);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Post post set post.viewCount = 0 where post.viewCount is null")
    int initializeNullViewCounts();
}