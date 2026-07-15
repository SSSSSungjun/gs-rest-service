package com.example.restservice.repository;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("postgres")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@EnabledIfEnvironmentVariable(named = "POSTGRES_TEST", matches = "true")
@DisplayName("PostgreSQL 스키마 통합 검증")
class PostgreSqlSchemaIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PostRepository postRepository;

    @Test
    @DisplayName("Flyway 초기 스키마가 모든 엔티티 테이블을 만들고 Hibernate 검증을 통과한다")
    void validatesFlywaySchemaAgainstJpaMappings() {
        List<String> tables = jdbcTemplate.queryForList("""
                select table_name
                from information_schema.tables
                where table_schema = 'public'
                  and table_name in (
                    'posts', 'comments', 'post_images', 'post_likes',
                    'comment_likes', 'poll_options', 'poll_votes'
                  )
                """, String.class);

        Long successfulMigrations = jdbcTemplate.queryForObject(
                "select count(*) from flyway_schema_history where success",
                Long.class
        );

        assertThat(tables).containsExactlyInAnyOrder(
                "posts", "comments", "post_images", "post_likes",
                "comment_likes", "poll_options", "poll_votes"
        );
        assertThat(successfulMigrations).isEqualTo(1L);
        assertThat(postRepository.count()).isZero();
    }
}
