package com.example.restservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "posts", indexes = {
    @Index(name = "idx_post_created_at", columnList = "createdAt DESC")
})

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY) // MySQL의 AUTO_INCREMENT 사용
    private Long id;

    @Column(nullable = false, length = 30)
    private String nickname;

    @Column(nullable = false, length = 100)
    private String password;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Builder.Default
    private int likeCount = 0;

    @CreationTimestamp // Insert 시 현재 시간 자동 입력
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp // Update 시 시간 자동 갱신
    private LocalDateTime updatedAt;
}