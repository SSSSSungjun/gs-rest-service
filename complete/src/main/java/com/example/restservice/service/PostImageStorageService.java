package com.example.restservice.service;

import com.example.restservice.dto.response.PostImageResponseDto;
import com.example.restservice.entity.PostImage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PostImageStorageService {
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp"
    );

    @Value("${app.upload.post-images-dir:uploads/post-images}")
    private String uploadDirectory;

    @Value("${app.upload.max-image-size:5242880}")
    private long maxImageSize;

    @Value("${app.upload.public-path:/uploads/post-images}")
    private String publicPath;

    public PostImageResponseDto store(MultipartFile file) {
        validate(file);

        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename() == null ? "image" : file.getOriginalFilename());
        String extension = getExtension(originalFilename);
        String storedFilename = UUID.randomUUID() + extension;

        try {
            Path directory = Path.of(uploadDirectory).toAbsolutePath().normalize();
            Files.createDirectories(directory);
            Path target = directory.resolve(storedFilename).normalize();
            if (!target.startsWith(directory)) {
                throw new IllegalArgumentException("파일 경로가 올바르지 않습니다.");
            }
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException exception) {
            throw new IllegalStateException("이미지 저장에 실패했습니다.", exception);
        }

        return PostImageResponseDto.builder()
                .sourceType(PostImage.SourceType.UPLOAD)
                .url(normalizePublicPath() + "/" + storedFilename)
                .originalFilename(originalFilename)
                .imageOrder(0)
                .build();
    }

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("이미지 파일을 선택해주세요.");
        }
        if (file.getSize() > maxImageSize) {
            throw new IllegalArgumentException("이미지는 5MB 이하로 업로드해주세요.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new IllegalArgumentException("JPG, PNG, GIF, WEBP 이미지만 업로드할 수 있습니다.");
        }
    }

    private String getExtension(String filename) {
        int dotIndex = filename.lastIndexOf('.');
        if (dotIndex < 0) {
            return "";
        }
        return filename.substring(dotIndex).toLowerCase(Locale.ROOT);
    }

    private String normalizePublicPath() {
        if (publicPath.endsWith("/")) {
            return publicPath.substring(0, publicPath.length() - 1);
        }
        return publicPath;
    }
}
