package com.roastmyresume.api.service;

import java.io.IOException;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.JsonNode;

@Service
public class ResumePersistenceService {

    private static final Logger logger = LoggerFactory.getLogger(ResumePersistenceService.class);

    private final SupabaseStorageService storageService;
    private final RestClient restClient;
    private final String serviceRoleKey;

    public ResumePersistenceService(
            SupabaseStorageService storageService,
            @Value("${supabase.url}") String supabaseUrl,
            @Value("${supabase.service-role-key}") String serviceRoleKey) {
        this.storageService = storageService;
        this.restClient = RestClient.create(supabaseUrl);
        this.serviceRoleKey = serviceRoleKey;
    }

    public SavedResume saveResume(
            String clerkUserId,
            MultipartFile file,
            JsonNode reviewData) throws IOException {
        validateReview(reviewData);

        String objectPath = storageService.uploadResume(clerkUserId, file);
        try {
            String accountId = findOrCreateAccount(clerkUserId);
            String reviewId = insertReview(accountId, file, objectPath, reviewData);
            return new SavedResume(reviewId, objectPath);
        } catch (RuntimeException exception) {
            try {
                storageService.deleteResume(objectPath);
            } catch (RuntimeException cleanupException) {
                logger.error("Could not remove orphaned resume object {}", objectPath,
                        cleanupException);
                exception.addSuppressed(cleanupException);
            }
            throw exception;
        }
    }

    private String findOrCreateAccount(String clerkUserId) {
        JsonNode accounts = authenticate(restClient.post()
                .uri(uriBuilder -> uriBuilder
                        .path("/rest/v1/accounts")
                        .queryParam("on_conflict", "clerk_user_id")
                        .queryParam("select", "id")
                        .build()))
                .header("Prefer", "resolution=merge-duplicates,return=representation")
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .body(Map.of("clerk_user_id", clerkUserId))
                .retrieve()
                .body(JsonNode.class);

        if (accounts == null || !accounts.isArray() || accounts.isEmpty()) {
            throw new IllegalStateException("Supabase did not return an account ID.");
        }

        String accountId = accounts.get(0).path("id").asString();
        if (accountId.isBlank()) {
            throw new IllegalStateException("Supabase returned an invalid account ID.");
        }
        return accountId;
    }

    private String insertReview(
            String accountId,
            MultipartFile file,
            String objectPath,
            JsonNode reviewData) {
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isBlank()) {
            originalFilename = "resume.pdf";
        }

        JsonNode reviews = authenticate(restClient.post()
                .uri(uriBuilder -> uriBuilder
                        .path("/rest/v1/resume_reviews")
                        .queryParam("select", "id")
                        .build()))
                .header("Prefer", "return=representation")
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .body(Map.of(
                        "account_id", accountId,
                        "original_filename", originalFilename,
                        "file_storage_key", objectPath,
                        "status", "completed",
                        "review_data", reviewData))
                .retrieve()
                .body(JsonNode.class);

        if (reviews == null || !reviews.isArray() || reviews.isEmpty()) {
            throw new IllegalStateException("Supabase did not return a review ID.");
        }

        String reviewId = reviews.get(0).path("id").asString();
        if (reviewId.isBlank()) {
            throw new IllegalStateException("Supabase returned an invalid review ID.");
        }
        return reviewId;
    }

    private RestClient.RequestBodySpec authenticate(RestClient.RequestBodySpec request) {
        request.header("apikey", serviceRoleKey);
        if (serviceRoleKey.startsWith("eyJ")) {
            request.header(HttpHeaders.AUTHORIZATION, "Bearer " + serviceRoleKey);
        }
        return request;
    }

    private void validateReview(JsonNode reviewData) {
        if (reviewData == null || !reviewData.isObject() || reviewData.isEmpty()) {
            throw new IllegalArgumentException("Review data is required.");
        }
    }

    public record SavedResume(String reviewId, String objectPath) {
    }
}
