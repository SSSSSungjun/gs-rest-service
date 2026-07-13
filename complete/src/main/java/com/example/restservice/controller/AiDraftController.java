package com.example.restservice.controller;

import com.example.restservice.dto.request.AiDraftRequestDto;
import com.example.restservice.dto.response.AiDraftResponseDto;
import com.example.restservice.service.AiDraftService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiDraftController {

    private final AiDraftService aiDraftService;

    @PostMapping("/drafts")
    public ResponseEntity<AiDraftResponseDto> generateDraft(
            @Valid @RequestBody AiDraftRequestDto request
    ) {
        return ResponseEntity.ok(new AiDraftResponseDto(
                aiDraftService.generateDraft(request.prompt())
        ));
    }
}
