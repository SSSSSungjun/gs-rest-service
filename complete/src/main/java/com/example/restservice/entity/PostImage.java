package com.example.restservice.entity;

import com.example.restservice.support.SeoulTime;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "post_images",
        indexes = {
                @Index(name = "idx_post_images_post_id", columnList = "post_id")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class PostImage {

    public enum SourceType {
        URL,
        UPLOAD
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 20)
    private SourceType sourceType;

    @Column(nullable = false, length = 2048)
    private String url;

    @Column(name = "original_filename", length = 255)
    private String originalFilename;

    @Column(name = "image_order", nullable = false)
    private int imageOrder;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public static PostImage of(Post post, SourceType sourceType, String url, String originalFilename, int imageOrder) {
        return PostImage.builder()
                .post(post)
                .sourceType(sourceType)
                .url(url)
                .originalFilename(originalFilename)
                .imageOrder(imageOrder)
                .build();
    }

    @jakarta.persistence.PrePersist
    protected void onCreate() {
        this.createdAt = SeoulTime.now();
    }
}
