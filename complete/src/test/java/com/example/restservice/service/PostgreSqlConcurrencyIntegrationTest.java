package com.example.restservice.service;

import com.example.restservice.dto.request.CommentRequestDto;
import com.example.restservice.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("postgres")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@EnabledIfEnvironmentVariable(named = "POSTGRES_TEST", matches = "true")
@DisplayName("PostgreSQL 게시판 동시성 통합 검증")
class PostgreSqlConcurrencyIntegrationTest {

    private static final String POST_OWNER = "post-owner";
    private static final String ACTOR_SESSION = "concurrent-actor";

    @Autowired
    private PostService postService;

    @Autowired
    private CommentService commentService;

    @Autowired
    private LikeService likeService;

    @Autowired
    private PollService pollService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void clearDatabase() {
        jdbcTemplate.execute("""
                truncate table comment_likes, post_likes, poll_votes, comments,
                    poll_options, post_images, posts restart identity cascade
                """);
    }

    @Test
    @DisplayName("게시글 삭제와 댓글 생성이 충돌해도 게시글과 댓글이 함께 제거된다")
    void deletePostRacingWithCommentCreationLeavesNoOrphanComment() throws Exception {
        Long postId = createPost(POST_OWNER);
        CommentRequestDto request = CommentRequestDto.builder()
                .nickname("동시 댓글")
                .content("삭제와 동시에 등록합니다.")
                .build();

        ConcurrentResult result = runConcurrently(
                () -> postService.deletePost(postId, POST_OWNER),
                () -> commentService.createComment(postId, request, ACTOR_SESSION)
        );

        assertThat(result.firstError()).isNull();
        assertSucceededOrNotFound(result.secondError());
        assertThat(countRows("posts")).isZero();
        assertThat(countRows("comments")).isZero();
    }

    @Test
    @DisplayName("게시글 삭제와 투표 참여가 충돌해도 투표 데이터가 남지 않는다")
    void deletePostRacingWithVoteLeavesNoOrphanVote() throws Exception {
        Long postId = createPost(POST_OWNER);
        Long optionId = createPollOption(postId, "찬성", 0);

        ConcurrentResult result = runConcurrently(
                () -> postService.deletePost(postId, POST_OWNER),
                () -> pollService.vote(postId, optionId, ACTOR_SESSION)
        );

        assertThat(result.firstError()).isNull();
        assertSucceededOrNotFound(result.secondError());
        assertThat(countRows("posts")).isZero();
        assertThat(countRows("poll_options")).isZero();
        assertThat(countRows("poll_votes")).isZero();
    }

    @Test
    @DisplayName("같은 세션의 동시 좋아요 토글은 직렬화되어 최종 좋아요가 남지 않는다")
    void concurrentPostLikeTogglesFromSameSessionAreSerialized() throws Exception {
        Long postId = createPost(POST_OWNER);

        ConcurrentResult result = runConcurrently(
                () -> likeService.togglePostLike(postId, ACTOR_SESSION),
                () -> likeService.togglePostLike(postId, ACTOR_SESSION)
        );

        assertThat(result.firstError()).isNull();
        assertThat(result.secondError()).isNull();
        assertThat(countRows("post_likes")).isZero();
    }

    @Test
    @DisplayName("같은 세션의 동시 투표는 직렬화되어 한 표만 유지된다")
    void concurrentVotesFromSameSessionKeepSingleVote() throws Exception {
        Long postId = createPost(POST_OWNER);
        Long optionId = createPollOption(postId, "찬성", 0);

        ConcurrentResult result = runConcurrently(
                () -> pollService.vote(postId, optionId, ACTOR_SESSION),
                () -> pollService.vote(postId, optionId, ACTOR_SESSION)
        );

        assertThat(result.firstError()).isNull();
        assertThat(result.secondError()).isNull();
        assertThat(countRows("poll_votes")).isEqualTo(1L);
        assertThat(jdbcTemplate.queryForObject(
                "select poll_option_id from poll_votes where post_id = ? and owner_session_id = ?",
                Long.class,
                postId,
                ACTOR_SESSION
        )).isEqualTo(optionId);
    }

    private Long createPost(String ownerSessionId) {
        return jdbcTemplate.queryForObject("""
                insert into posts (
                    nickname, content, owner_session_id, anonymous_token,
                    show_images_in_content, view_count, created_at, updated_at
                )
                values (?, ?, ?, ?, true, 0, current_timestamp, current_timestamp)
                returning id
                """, Long.class, "테스트 작성자", "동시성 테스트 게시글", ownerSessionId, ownerSessionId);
    }

    private Long createPollOption(Long postId, String content, int optionOrder) {
        return jdbcTemplate.queryForObject("""
                insert into poll_options (post_id, content, option_order)
                values (?, ?, ?)
                returning id
                """, Long.class, postId, content, optionOrder);
    }

    private long countRows(String tableName) {
        Long count = jdbcTemplate.queryForObject("select count(*) from " + tableName, Long.class);
        return count == null ? 0L : count;
    }

    private void assertSucceededOrNotFound(Throwable error) {
        if (error != null) {
            assertThat(error).isInstanceOf(ResourceNotFoundException.class);
        }
    }

    private ConcurrentResult runConcurrently(
            ConcurrentAction firstAction,
            ConcurrentAction secondAction
    ) throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);

        try {
            Future<Throwable> first = executor.submit(
                    () -> runAfterSignal(ready, start, firstAction)
            );
            Future<Throwable> second = executor.submit(
                    () -> runAfterSignal(ready, start, secondAction)
            );

            boolean bothReady = ready.await(5, TimeUnit.SECONDS);
            start.countDown();

            assertThat(bothReady).as("두 요청이 동시에 출발할 준비를 마쳐야 한다").isTrue();
            return new ConcurrentResult(
                    first.get(10, TimeUnit.SECONDS),
                    second.get(10, TimeUnit.SECONDS)
            );
        } finally {
            start.countDown();
            executor.shutdownNow();
            assertThat(executor.awaitTermination(5, TimeUnit.SECONDS))
                    .as("동시성 테스트 executor가 종료되어야 한다")
                    .isTrue();
        }
    }

    private Throwable runAfterSignal(
            CountDownLatch ready,
            CountDownLatch start,
            ConcurrentAction action
    ) {
        ready.countDown();
        try {
            if (!start.await(5, TimeUnit.SECONDS)) {
                return new AssertionError("동시 시작 신호를 받지 못했습니다.");
            }
            action.run();
            return null;
        } catch (Throwable error) {
            return error;
        }
    }

    @FunctionalInterface
    private interface ConcurrentAction {
        void run() throws Exception;
    }

    private record ConcurrentResult(Throwable firstError, Throwable secondError) {
    }
}
