package com.example.restservice.service;

import com.example.restservice.dto.request.PostImageRequestDto;
import com.example.restservice.dto.request.PostRequestDto;
import com.example.restservice.dto.response.PostResponseDto;
import com.example.restservice.entity.PollOption;
import com.example.restservice.entity.Post;
import com.example.restservice.entity.PostImage;
import com.example.restservice.exception.ForbiddenOperationException;
import com.example.restservice.repository.CommentLikeRepository;
import com.example.restservice.repository.LikeCountProjection;
import com.example.restservice.repository.PollVoteRepository;
import com.example.restservice.repository.PostLikeRepository;
import com.example.restservice.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PostService {
    private static final String DEFAULT_NICKNAME = "익명";
    private static final int MAX_IMAGE_COUNT = 10;
    private static final int MIN_POLL_OPTION_COUNT = 2;
    private static final int MAX_POLL_OPTION_COUNT = 5;

    private final PostRepository postRepository;
    private final PostLikeRepository postLikeRepository;
    private final CommentLikeRepository commentLikeRepository;
    private final PollVoteRepository pollVoteRepository;

    public List<PostResponseDto> getAllPosts(String sessionId) {
        List<Post> posts = postRepository.findAllByOrderByCreatedAtDesc();
        List<Long> postIds = posts.stream()
                .map(Post::getId)
                .toList();
        List<Long> commentIds = posts.stream()
                .flatMap(post -> post.getComments().stream())
                .map(comment -> comment.getId())
                .toList();

        Map<Long, Long> postLikeCounts = getPostLikeCounts(postIds);
        Set<Long> likedPostIds = postIds.isEmpty()
                ? Set.of()
                : Set.copyOf(postLikeRepository.findLikedPostIds(sessionId, postIds));
        Map<Long, Long> commentLikeCounts = getCommentLikeCounts(commentIds);
        Set<Long> likedCommentIds = commentIds.isEmpty()
                ? Set.of()
                : Set.copyOf(commentLikeRepository.findLikedCommentIds(sessionId, commentIds));
        Map<Long, Long> pollVoteCounts = getPollVoteCounts(postIds);
        Set<Long> votedPollOptionIds = postIds.isEmpty()
                ? Set.of()
                : Set.copyOf(pollVoteRepository.findVotedOptionIds(sessionId, postIds));

        return posts.stream()
                .map(post -> PostResponseDto.from(
                        post,
                        sessionId,
                        postLikeCounts.getOrDefault(post.getId(), 0L),
                        likedPostIds.contains(post.getId()),
                        commentLikeCounts,
                        likedCommentIds,
                        pollVoteCounts,
                        votedPollOptionIds
                ))
                .toList();
    }

    @Transactional
    public PostResponseDto createPost(PostRequestDto requestDto, String sessionId) {
        validateContent(requestDto.getContent());
        validateImages(requestDto.getImages());
        List<String> pollOptions = normalizePollOptions(requestDto.getPollOptions());

        Post post = Post.builder()
                .nickname(normalizeNickname(requestDto.getNickname()))
                .content(requestDto.getContent().trim())
                .ownerSessionId(sessionId)
                .showImagesInContent(requestDto.isShowImagesInContent())
                .build();
        post.replaceImages(toPostImages(post, requestDto.getImages()));
        post.replacePollOptions(toPollOptions(post, pollOptions));

        return PostResponseDto.from(postRepository.save(post), sessionId);
    }

    @Transactional
    public void increaseViewCount(Long id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 글입니다."));
        post.increaseViewCount();
    }

    @Transactional
    public PostResponseDto updatePost(Long id, PostRequestDto requestDto, String sessionId) {
        validateContent(requestDto.getContent());
        validateImages(requestDto.getImages());

        Post post = postRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 글입니다."));
        validateOwner(post, sessionId);

        post.update(normalizeNickname(requestDto.getNickname()), requestDto.getContent().trim(), requestDto.isShowImagesInContent());
        post.replaceImages(toPostImages(post, requestDto.getImages()));
        return PostResponseDto.from(post, sessionId);
    }

    @Transactional
    public void deletePost(Long id, String sessionId) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 글입니다."));
        validateOwner(post, sessionId);

        commentLikeRepository.deleteByPostId(id);
        postLikeRepository.deleteByPostId(id);
        pollVoteRepository.deleteByPostId(id);
        postRepository.delete(post);
    }

    private Map<Long, Long> getPostLikeCounts(List<Long> postIds) {
        if (postIds.isEmpty()) {
            return Map.of();
        }
        return postLikeRepository.countByPostIds(postIds).stream()
                .collect(Collectors.toMap(LikeCountProjection::getTargetId, LikeCountProjection::getLikeCount));
    }

    private Map<Long, Long> getCommentLikeCounts(List<Long> commentIds) {
        if (commentIds.isEmpty()) {
            return Map.of();
        }
        return commentLikeRepository.countByCommentIds(commentIds).stream()
                .collect(Collectors.toMap(LikeCountProjection::getTargetId, LikeCountProjection::getLikeCount));
    }

    private Map<Long, Long> getPollVoteCounts(List<Long> postIds) {
        if (postIds.isEmpty()) {
            return Map.of();
        }
        return pollVoteRepository.countByPostIds(postIds).stream()
                .collect(Collectors.toMap(LikeCountProjection::getTargetId, LikeCountProjection::getLikeCount));
    }

    private void validateOwner(Post post, String sessionId) {
        if (!post.isOwnedBy(sessionId)) {
            throw new ForbiddenOperationException("본인이 작성한 글만 수정하거나 삭제할 수 있습니다.");
        }
    }

    private void validateContent(String content) {
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("내용을 입력해주세요.");
        }
    }

    private void validateImages(List<PostImageRequestDto> images) {
        if (images == null || images.isEmpty()) {
            return;
        }
        if (images.size() > MAX_IMAGE_COUNT) {
            throw new IllegalArgumentException("이미지는 최대 10장까지 첨부할 수 있습니다.");
        }
        images.forEach(this::validateImage);
    }

    private void validateImage(PostImageRequestDto image) {
        if (image == null || image.getSourceType() == null || image.getUrl() == null || image.getUrl().isBlank()) {
            throw new IllegalArgumentException("이미지 정보가 올바르지 않습니다.");
        }

        String url = image.getUrl().trim();
        if (image.getSourceType() == PostImage.SourceType.UPLOAD) {
            if (!url.startsWith("/uploads/post-images/")) {
                throw new IllegalArgumentException("업로드 이미지 경로가 올바르지 않습니다.");
            }
            return;
        }

        try {
            URI uri = URI.create(url);
            String scheme = uri.getScheme();
            if (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme)) {
                throw new IllegalArgumentException("이미지 URL은 http 또는 https로 시작해야 합니다.");
            }
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("이미지 URL 형식이 올바르지 않습니다.");
        }
    }

    private List<String> normalizePollOptions(List<String> pollOptions) {
        if (pollOptions == null || pollOptions.isEmpty()) {
            return List.of();
        }

        List<String> normalizedOptions = pollOptions.stream()
                .filter(option -> option != null && !option.isBlank())
                .map(String::trim)
                .distinct()
                .toList();
        if (normalizedOptions.isEmpty()) {
            return List.of();
        }
        if (normalizedOptions.size() < MIN_POLL_OPTION_COUNT) {
            throw new IllegalArgumentException("투표 선택지는 2개 이상 입력해주세요.");
        }
        if (normalizedOptions.size() > MAX_POLL_OPTION_COUNT) {
            throw new IllegalArgumentException("투표 선택지는 최대 5개까지 만들 수 있습니다.");
        }
        return normalizedOptions;
    }

    private List<PostImage> toPostImages(Post post, List<PostImageRequestDto> imageRequests) {
        if (imageRequests == null || imageRequests.isEmpty()) {
            return List.of();
        }
        return IntStream.range(0, imageRequests.size())
                .mapToObj(index -> {
                    PostImageRequestDto image = imageRequests.get(index);
                    String originalFilename = image.getOriginalFilename() == null || image.getOriginalFilename().isBlank()
                            ? null
                            : image.getOriginalFilename().trim();
                    return PostImage.of(
                            post,
                            image.getSourceType(),
                            image.getUrl().trim(),
                            originalFilename,
                            index
                    );
                })
                .toList();
    }

    private List<PollOption> toPollOptions(Post post, List<String> pollOptions) {
        if (pollOptions.isEmpty()) {
            return List.of();
        }
        return IntStream.range(0, pollOptions.size())
                .mapToObj(index -> PollOption.of(post, pollOptions.get(index), index))
                .toList();
    }

    private String normalizeNickname(String nickname) {
        if (nickname == null || nickname.isBlank()) {
            return DEFAULT_NICKNAME;
        }
        return nickname.trim();
    }
}
