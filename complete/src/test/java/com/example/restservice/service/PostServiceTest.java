package com.example.restservice.service;

import com.example.restservice.dto.request.PostRequestDto;
import com.example.restservice.dto.response.PostResponseDto;
import com.example.restservice.entity.PollOption;
import com.example.restservice.entity.Post;
import com.example.restservice.event.BoardActivityCreatedEvent;
import com.example.restservice.repository.CommentLikeRepository;
import com.example.restservice.repository.PollVoteRepository;
import com.example.restservice.repository.PostLikeRepository;
import com.example.restservice.repository.PostRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PostServiceTest {

    @Mock
    private PostRepository postRepository;
    @Mock
    private PostLikeRepository postLikeRepository;
    @Mock
    private CommentLikeRepository commentLikeRepository;
    @Mock
    private PollVoteRepository pollVoteRepository;
    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private PostService postService;

    @Test
    @DisplayName("게시글 생성 시 입력값을 정규화하고 활동 이벤트를 발행한다")
    void createPostNormalizesInputAndPublishesActivityEvent() {
        PostRequestDto request = PostRequestDto.builder()
                .nickname("  ")
                .content("  행사 후기입니다.  ")
                .pollOptions(List.of("찬성", " 찬성 ", "반대"))
                .showImagesInContent(true)
                .build();
        Post persistedPost = Post.builder()
                .id(11L)
                .nickname("익명")
                .content("행사 후기입니다.")
                .ownerSessionId("session-1")
                .showImagesInContent(true)
                .build();
        when(postRepository.save(any(Post.class))).thenReturn(persistedPost);

        PostResponseDto response = postService.createPost(request, "session-1");

        ArgumentCaptor<Post> postCaptor = ArgumentCaptor.forClass(Post.class);
        verify(postRepository).save(postCaptor.capture());
        Post postToSave = postCaptor.getValue();
        assertThat(postToSave.getNickname()).isEqualTo("익명");
        assertThat(postToSave.getContent()).isEqualTo("행사 후기입니다.");
        assertThat(postToSave.getPollOptions())
                .extracting(PollOption::getContent)
                .containsExactly("찬성", "반대");

        ArgumentCaptor<BoardActivityCreatedEvent> eventCaptor =
                ArgumentCaptor.forClass(BoardActivityCreatedEvent.class);
        verify(eventPublisher).publishEvent(eventCaptor.capture());
        assertThat(eventCaptor.getValue().type()).isEqualTo(BoardActivityCreatedEvent.Type.POST);
        assertThat(eventCaptor.getValue().postId()).isEqualTo(11L);
        assertThat(eventCaptor.getValue().ownerSessionId()).isEqualTo("session-1");
        assertThat(response.getId()).isEqualTo(11L);
    }

    @Test
    @DisplayName("게시글 내용이 비어 있으면 저장하지 않는다")
    void createPostRejectsBlankContentBeforeSaving() {
        PostRequestDto request = PostRequestDto.builder()
                .content("   ")
                .build();

        assertThatThrownBy(() -> postService.createPost(request, "session-1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("내용을 입력해주세요.");

        verify(postRepository, never()).save(any());
        verify(eventPublisher, never()).publishEvent(any());
    }
}
