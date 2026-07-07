package com.example.restservice.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "posts", indexes = @Index(name = "idx_anonymous_token", columnList = "anonymousToken"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nickname; //유동 닉네임

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "anonymous_token", nullable = false)
    private String anonymousToken; //익명 검증 토큰

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}