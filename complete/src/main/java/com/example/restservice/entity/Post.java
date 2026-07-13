package com.example.restservice.entity;

import com.example.restservice.support.SeoulTime;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "posts",
        indexes = {
                @Index(name = "idx_posts_created_at", columnList = "created_at"),
                @Index(name = "idx_posts_owner_session_id", columnList = "owner_session_id")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 40)
    private String nickname;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "owner_session_id", nullable = false, length = 80)
    private String ownerSessionId;

    @Column(name = "anonymous_token", nullable = false, length = 80)
    private String legacyAnonymousToken;

    @Column(name = "show_images_in_content", nullable = false)
    private boolean showImagesInContent;

    @Builder.Default
    @Column(name = "view_count")
    private Long viewCount = 0L;

    @Transient
    private boolean viewCountOnlyUpdate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Builder.Default
    @OrderBy("createdAt ASC")
    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Comment> comments = new ArrayList<>();

    @Builder.Default
    @OrderBy("imageOrder ASC")
    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PostImage> images = new ArrayList<>();

    @Builder.Default
    @OrderBy("optionOrder ASC")
    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PollOption> pollOptions = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = SeoulTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.legacyAnonymousToken == null || this.legacyAnonymousToken.isBlank()) {
            this.legacyAnonymousToken = this.ownerSessionId;
        }
        if (this.viewCount == null) {
            this.viewCount = 0L;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        if (viewCountOnlyUpdate) {
            viewCountOnlyUpdate = false;
            return;
        }
        this.updatedAt = SeoulTime.now();
    }

    public boolean isOwnedBy(String sessionId) {
        return ownerSessionId != null && ownerSessionId.equals(sessionId);
    }

    public void update(String nickname, String content, boolean showImagesInContent) {
        this.nickname = nickname;
        this.content = content;
        this.showImagesInContent = showImagesInContent;
    }

    public long getViewCount() {
        return viewCount == null ? 0L : viewCount;
    }

    public void increaseViewCount() {
        this.viewCount = getViewCount() + 1;
        this.viewCountOnlyUpdate = true;
    }

    public void replaceImages(List<PostImage> nextImages) {
        this.images.clear();
        this.images.addAll(nextImages);
    }

    public void replacePollOptions(List<PollOption> nextPollOptions) {
        this.pollOptions.clear();
        this.pollOptions.addAll(nextPollOptions);
    }
}
