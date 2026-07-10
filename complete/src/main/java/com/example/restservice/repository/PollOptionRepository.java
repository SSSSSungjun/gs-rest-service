package com.example.restservice.repository;

import com.example.restservice.entity.PollOption;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PollOptionRepository extends JpaRepository<PollOption, Long> {
    Optional<PollOption> findByIdAndPostId(Long id, Long postId);
}
