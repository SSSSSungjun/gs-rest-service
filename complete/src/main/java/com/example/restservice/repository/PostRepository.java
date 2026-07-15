package com.example.restservice.repository;

import com.example.restservice.entity.Post;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PostRepository extends JpaRepository<Post, Long> {
    @Query("""
            select post
            from Post post
            where :query = ''
               or lower(post.nickname) like concat('%', :query, '%')
               or lower(post.content) like concat('%', :query, '%')
            """)
    Page<Post> search(@Param("query") String query, Pageable pageable);

    @Query(
            value = """
                    select post
                    from Post post
                    left join PostLike postLike on postLike.post = post
                    where :query = ''
                       or lower(post.nickname) like concat('%', :query, '%')
                       or lower(post.content) like concat('%', :query, '%')
                    group by post
                    order by count(postLike.id) desc, post.createdAt desc
                    """,
            countQuery = """
                    select count(post)
                    from Post post
                    where :query = ''
                       or lower(post.nickname) like concat('%', :query, '%')
                       or lower(post.content) like concat('%', :query, '%')
                    """
    )
    Page<Post> searchPopular(@Param("query") String query, Pageable pageable);

    List<Post> findByOwnerSessionIdOrderByCreatedAtDesc(String ownerSessionId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Post> findWithLockById(Long id);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Post post set post.viewCount = coalesce(post.viewCount, 0) + 1 where post.id = :id")
    int incrementViewCount(@Param("id") Long id);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Post post set post.viewCount = 0 where post.viewCount is null")
    int initializeNullViewCounts();
}
