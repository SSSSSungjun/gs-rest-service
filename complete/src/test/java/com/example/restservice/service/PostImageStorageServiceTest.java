package com.example.restservice.service;

import com.example.restservice.dto.response.PostImageResponseDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class PostImageStorageServiceTest {

    @TempDir
    Path uploadDirectory;

    @Test
    void usesValidatedContentTypeInsteadOfOriginalFilenameExtension() {
        PostImageStorageService service = new PostImageStorageService();
        ReflectionTestUtils.setField(service, "uploadDirectory", uploadDirectory.toString());
        ReflectionTestUtils.setField(service, "maxImageSize", 5_242_880L);
        ReflectionTestUtils.setField(service, "publicPath", "/uploads/post-images");

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "payload.html",
                "image/png",
                new byte[]{(byte) 0x89, 0x50, 0x4e, 0x47}
        );

        PostImageResponseDto stored = service.store(file);

        assertThat(stored.getUrl()).endsWith(".png").doesNotEndWith(".html");
    }
}
