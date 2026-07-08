package com.example.restservice.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    private final String[] allowedOrigins;
    private final String uploadDirectory;
    private final String uploadPublicPath;

    public WebConfig(
            @Value("${app.cors.allowed-origins:http://localhost:5173,http://127.0.0.1:5173}") String allowedOrigins,
            @Value("${app.upload.post-images-dir:uploads/post-images}") String uploadDirectory,
            @Value("${app.upload.public-path:/uploads/post-images}") String uploadPublicPath
    ) {
        this.allowedOrigins = allowedOrigins.split(",");
        this.uploadDirectory = uploadDirectory;
        this.uploadPublicPath = uploadPublicPath;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins)
                .allowedMethods("GET", "POST", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String publicPattern = normalizePublicPath(uploadPublicPath) + "/**";
        String uploadLocation = Path.of(uploadDirectory).toAbsolutePath().normalize().toUri().toString();
        registry.addResourceHandler(publicPattern)
                .addResourceLocations(uploadLocation);
    }

    private String normalizePublicPath(String path) {
        if (path.endsWith("/")) {
            return path.substring(0, path.length() - 1);
        }
        return path;
    }
}
