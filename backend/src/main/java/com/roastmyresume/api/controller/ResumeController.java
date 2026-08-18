package com.roastmyresume.api.controller;

import com.roastmyresume.api.service.ResumeAiReviewService;
import com.roastmyresume.api.service.ResumePersistenceService;
import java.io.IOException;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.JsonNode;

@RestController
@RequestMapping("/api/resume")
public class ResumeController {

    private static final Logger logger = LoggerFactory.getLogger(ResumeController.class);

    private final ResumeAiReviewService resumeAiReviewService;
    private final ResumePersistenceService resumePersistenceService;

    public ResumeController(
            ResumeAiReviewService resumeAiReviewService,
            ResumePersistenceService resumePersistenceService) {
        this.resumeAiReviewService = resumeAiReviewService;
        this.resumePersistenceService = resumePersistenceService;
    }

    @PostMapping(value = "/review", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<JsonNode> review(@RequestParam("file") MultipartFile file) {
        try {
            return ResponseEntity.ok(resumeAiReviewService.review(file));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping(
            value = "/upload",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, String>> upload(
            @AuthenticationPrincipal Jwt jwt,
            @RequestPart("file") MultipartFile file,
            @RequestPart("review") JsonNode reviewData) {
        try {
            ResumePersistenceService.SavedResume savedResume =
                    resumePersistenceService.saveResume(jwt.getSubject(), file, reviewData);
            return ResponseEntity.ok(Map.of(
                    "path", savedResume.objectPath(),
                    "reviewId", savedResume.reviewId()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (RestClientResponseException e) {
            logger.error("Supabase Storage rejected the resume upload with status {}",
                    e.getStatusCode(), e);
            return ResponseEntity.status(502)
                    .body(Map.of("error", "Supabase could not save the resume."));
        } catch (IllegalStateException | IOException e) {
            logger.error("Could not upload resume to Supabase Storage", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "The resume could not be saved."));
        }
    }
}
