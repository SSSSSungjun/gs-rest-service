package com.example.restservice.repository; 

import com.example.restservice.entity.Post; 

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PostRepository extends JpaRepository<Post, Long> {
    
    //최신 글이 맨 위로 올라오도록 
    List<Post> findAllByOrderByCreatedAtDesc();
}