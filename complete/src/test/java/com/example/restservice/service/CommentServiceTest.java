package com.example.restservice.service;

import com.example.restservice.dto.request.CommentRequestDto;
import com.example.restservice.dto.response.CommentResponseDto;
import com.example.restservice.entity.Comment;
import com.example.restservice.entity.Post;
import com.example.restservice.event.BoardActivityCreatedEvent;
import com.example.restservice.repository.CommentLikeRepository;
import com.example.restservice.repository.CommentRepository;
import com.example.restservice.repository.PostRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommentServiceTest {

    @Mock
    private PostRepository postRepository;
    @Mock
    private CommentRepository commentRepository;
    @Mock
    private CommentLikeRepository commentLikeRepository;
    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private CommentService commentService;

    @Test
    @DisplayName("댓글 생성 시 게시글을 잠금 조회하고 활동 이벤트를 발행한다")
    void createCommentUsesLockedPostAndPublishesActivityEvent() {
        Post post = post(21L);
        CommentRequestDto request = CommentRequestDto.builder()
                .nickname("  ")
                .content("  재밌었습니다.  ")
                .build();
        Comment persistedComment = Comment.builder()
                .id(31L)
                .post(post)
                .nickname("익명")
                .content("재밌었습니다.")
                .ownerSessionId("session-2")
                .build();
        when(postRepository.findWithLockById(21L)).thenReturn(Optional.of(post));
        when(commentRepository.save(any(Comment.class))).thenReturn(persistedComment);

        CommentResponseDto response = commentService.createComment(21L, request, "session-2");

        verify(postRepository).findWithLockById(21L);
        ArgumentCaptor<Comment> commentCaptor = ArgumentCaptor.forClass(Comment.class);
        verify(commentRepository).save(commentCaptor.capture());
        assertThat(commentCaptor.getValue().getNickname()).isEqualTo("익명");
        assertThat(commentCaptor.getValue().getContent()).isEqualTo("재밌었습니다.");
        assertThat(commentCaptor.getValue().getParentComment()).isNull();

        ArgumentCaptor<BoardActivityCreatedEvent> eventCaptor =
                ArgumentCaptor.forClass(BoardActivityCreatedEvent.class);
        verify(eventPublisher).publishEvent(eventCaptor.capture());
        assertThat(eventCaptor.getValue().type()).isEqualTo(BoardActivityCreatedEvent.Type.COMMENT);
        assertThat(eventCaptor.getValue().postId()).isEqualTo(21L);
        assertThat(eventCaptor.getValue().ownerSessionId()).isEqualTo("session-2");
        assertThat(response.getId()).isEqualTo(31L);
    }

    @Test
    @DisplayName("다른 게시글의 댓글에는 답글을 작성할 수 없다")
    void createReplyRejectsParentFromAnotherPost() {
        Post targetPost = post(21L);
        Post otherPost = post(22L);
        Comment parentComment = Comment.builder()
                .id(41L)
                .post(otherPost)
                .nickname("익명")
                .content("다른 글의 댓글")
                .ownerSessionId("session-3")
                .build();
        CommentRequestDto request = CommentRequestDto.builder()
                .content("답글")
                .parentCommentId(41L)
                .build();
        when(postRepository.findWithLockById(21L)).thenReturn(Optional.of(targetPost));
        when(commentRepository.findWithLockById(41L)).thenReturn(Optional.of(parentComment));

        assertThatThrownBy(() -> commentService.createComment(21L, request, "session-2"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("같은 글의 댓글에만 답글을 남길 수 있습니다.");

        verify(commentRepository, never()).save(any());
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    @DisplayName("댓글 내용이 비어 있으면 게시글을 조회하지 않는다")
    void createCommentRejectsBlankContentBeforeLockingPost() {
        CommentRequestDto request = CommentRequestDto.builder()
                .content(" ")
                .build();

        assertThatThrownBy(() -> commentService.createComment(21L, request, "session-2"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("댓글 내용을 입력해주세요.");

        verify(postRepository, never()).findWithLockById(any());
        verify(commentRepository, never()).save(any());
    }

    private Post post(Long id) {
        return Post.builder()
                .id(id)
                .nickname("익명")
                .content("게시글")
                .ownerSessionId("owner")
                .showImagesInContent(true)
                .build();
    }
}
