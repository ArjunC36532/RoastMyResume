package com.roastmyresume.api.service;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

@Service
public class SupabaseStorageService {

    private static final byte[] PDF_SIGNATURE = { '%', 'P', 'D', 'F', '-' };

    private final RestClient restClient;
    private final String serviceRoleKey;
    private final String bucket;
    private final long maxUploadBytes;

    public SupabaseStorageService(
            @Value("${supabase.url}") String supabaseUrl,
            @Value("${supabase.service-role-key}") String serviceRoleKey,
            @Value("${supabase.storage.bucket}") String bucket,
            @Value("${app.upload.max-bytes}") long maxUploadBytes) {
        this.restClient = RestClient.create(supabaseUrl);
        this.serviceRoleKey = serviceRoleKey;
        this.bucket = bucket;
        this.maxUploadBytes = maxUploadBytes;
    }

    public String uploadResume(String clerkUserId, MultipartFile file) throws IOException {
        validateConfiguration();
        validateResume(file);

        String objectPath = clerkUserId + "/" + UUID.randomUUID() + ".pdf";
        byte[] contents = file.getBytes();

        RestClient.RequestBodySpec request = restClient.post()
                .uri(uriBuilder -> uriBuilder
                        .path("/storage/v1/object")
                        .pathSegment(bucket)
                        .pathSegment(objectPath.split("/"))
                        .build());

        authenticate(request)
                .header("x-upsert", "false")
                .contentType(MediaType.APPLICATION_PDF)
                .body(contents)
                .retrieve()
                .toBodilessEntity();

        return objectPath;
    }

    public void deleteResume(String objectPath) {
        RestClient.RequestBodySpec request = restClient.method(HttpMethod.DELETE)
                .uri(uriBuilder -> uriBuilder
                        .path("/storage/v1/object")
                        .pathSegment(bucket)
                        .build());

        authenticate(request)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("prefixes", List.of(objectPath)))
                .retrieve()
                .toBodilessEntity();
    }

    private RestClient.RequestBodySpec authenticate(RestClient.RequestBodySpec request) {
        request.header("apikey", serviceRoleKey);
        if (serviceRoleKey.startsWith("eyJ")) {
            request.header(HttpHeaders.AUTHORIZATION, "Bearer " + serviceRoleKey);
        }
        return request;
    }

    private void validateConfiguration() {
        if (serviceRoleKey == null || serviceRoleKey.isBlank()) {
            throw new IllegalStateException(
                    "SUPABASE_SERVICE_ROLE_KEY is not configured on the backend.");
        }
    }

    private void validateResume(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Choose a non-empty PDF file.");
        }
        if (file.getSize() > maxUploadBytes) {
            throw new IllegalArgumentException("The PDF exceeds the 10 MB upload limit.");
        }

        byte[] contents = file.getBytes();
        if (contents.length < PDF_SIGNATURE.length) {
            throw new IllegalArgumentException("The uploaded file is not a valid PDF.");
        }
        for (int index = 0; index < PDF_SIGNATURE.length; index++) {
            if (contents[index] != PDF_SIGNATURE[index]) {
                throw new IllegalArgumentException("The uploaded file is not a valid PDF.");
            }
        }
    }
}
