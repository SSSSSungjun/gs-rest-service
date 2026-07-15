package com.example.restservice.repository;

import com.example.restservice.entity.Comment;
import com.example.restservice.entity.Post;
import com.example.restservice.entity.PostLike;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class FeedSearchRepositoryTest {

    @Autowired
    private PostRepository postRepository;
    @Autowired
    private CommentRepository commentRepository;
    @Autowired
    private PostLikeRepository postLikeRepository;

    @Test
    @DisplayName("게시글 검색 결과를 DB에서 페이지 단위로 조회한다")
    void searchesPostsWithPagination() {
        savePost("첫 작성자", "공통검색어 첫 번째 글", "owner-1");
        savePost("공통검색어 작성자", "두 번째 글", "owner-2");
        savePost("다른 작성자", "검색에 포함되지 않는 글", "owner-3");
        postRepository.flush();

        Page<Post> result = postRepository.search(
                "공통검색어",
                PageRequest.of(0, 1, Sort.by(Sort.Direction.DESC, "createdAt"))
        );

        assertThat(result.getTotalElements()).isEqualTo(2);
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getTotalPages()).isEqualTo(2);
    }

    @Test
    @DisplayName("인기순 게시글은 좋아요 수가 많은 글부터 조회한다")
    void sortsPostsByLikeCount() {
        Post quietPost = savePost("익명", "조용한 글", "owner-1");
        Post popularPost = savePost("익명", "인기 글", "owner-2");
        postLikeRepository.save(PostLike.builder()
                .post(popularPost)
                .ownerSessionId("reader-1")
                .build());
        postLikeRepository.save(PostLike.builder()
                .post(popularPost)
                .ownerSessionId("reader-2")
                .build());
        postRepository.flush();

        Page<Post> result = postRepository.searchPopular("", PageRequest.of(0, 10));

        assertThat(result.getContent()).extracting(Post::getId)
                .startsWith(popularPost.getId())
                .contains(quietPost.getId());
    }

    @Test
    @DisplayName("댓글 검색 결과를 DB에서 페이지 단위로 조회한다")
    void searchesCommentsWithPagination() {
        Post post = savePost("익명", "원문", "owner-1");
        commentRepository.save(Comment.builder()
                .post(post)
                .nickname("댓글 작성자")
                .content("댓글검색어가 들어간 내용")
                .ownerSessionId("reader-1")
                .build());
        commentRepository.save(Comment.builder()
                .post(post)
                .nickname("다른 작성자")
                .content("일치하지 않는 댓글")
                .ownerSessionId("reader-2")
                .build());
        commentRepository.flush();

        Page<Comment> result = commentRepository.search(
                "댓글검색어",
                PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "createdAt"))
        );

        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent()).extracting(Comment::getContent)
                .containsExactly("댓글검색어가 들어간 내용");
    }

    private Post savePost(String nickname, String content, String ownerSessionId) {
        return postRepository.save(Post.builder()
                .nickname(nickname)
                .content(content)
                .ownerSessionId(ownerSessionId)
                .showImagesInContent(true)
                .build());
    }
}
