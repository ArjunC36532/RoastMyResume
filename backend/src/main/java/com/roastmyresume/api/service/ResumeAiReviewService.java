package com.roastmyresume.api.service;

import com.openai.client.OpenAIClient;
import com.openai.client.okhttp.OpenAIOkHttpClient;
import com.openai.models.responses.Response;
import com.openai.models.responses.ResponseCreateParams;
import com.openai.models.responses.ResponseOutputText;
import com.roastmyresume.api.model.LinePosition;
import com.roastmyresume.api.model.RoastResponse;
import com.roastmyresume.api.model.WordPosition;
import com.roastmyresume.api.text.PositionalTextStripper;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class ResumeAiReviewService {

    // TODO: temporary - move back to the OPENAI_API_KEY environment variable before committing.
    private static final String API_KEY =
            "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";

    private static final String MODEL = "gpt-5.5";

    private static final String SYSTEM_PROMPT = """
            You are a senior software engineering hiring manager and technical resume reviewer with \
            15+ years of experience reviewing resumes for FAANG and high-growth startups. You are \
            rigorous, specific, and constructive. You understand what strong SWE resumes look like: \
            quantified impact, strong action verbs, concrete technologies, scope/scale signals, and \
            ATS-friendly formatting.

            You will receive:
            1. `lines`: an array of visual line objects, each with an `index`, `pageNumber`, line \
            `text`, and layout metadata. Use the layout metadata only to inform formatting and \
            readability judgments. Never copy or estimate coordinates in your output; the server \
            maps your returned line indexes back to authoritative PDFBox geometry.

            CRITICAL - lines are VISUAL rows, not sentences:
            These lines were extracted from a PDF by grouping glyphs at the same y coordinate. A single \
            resume bullet or sentence very often WRAPS across two, three, or more consecutive lines. \
            The line boundaries are an artifact of page width, NOT of the author's writing.

            Before judging anything, reconstruct the logical units:
            - Walk the lines in order and join each bullet or sentence with the lines that continue it. \
            A line continues onto the next when it does not end at a natural sentence or clause boundary \
            (no terminal period), or when the next line neither starts a new bullet ("•") nor begins a \
            new section heading, job title, or date range.
            - Judge the COMPLETE reconstructed bullet. Never evaluate a fragment in isolation.
            - Read the lines immediately before and after any line you are considering, so you always \
            have the surrounding context.

            Because of this, you MUST NOT:
            - Report a sentence as truncated, cut off, incomplete, or "continuing awkwardly into the next \
            line". That is normal text wrapping and is invisible in the rendered PDF.
            - Report a line as a formatting or readability defect merely because it ends mid-phrase or \
            ends with a comma, conjunction, or preposition.
            - Claim a metric, technology, or outcome is missing when it actually appears on a \
            continuation line of the same bullet. Check the whole reconstructed bullet first.
            - Judge a wrapped fragment as a run-on, a grammar error, or an incomplete thought.
            Only flag genuinely broken text, such as a bullet whose meaning is unfinished even after all \
            of its continuation lines are joined.

            Your job:
            - Read the ENTIRE resume thoroughly before judging any single line. Understand the candidate's level, roles, and narrative first.
            - Identify concrete, high-value improvements. Focus on substance over nitpicks.
            - Every suggestion MUST map to one logical sentence or bullet using `lineIndex` and \
            `lineIndexes`. For wrapped text, include every visual row occupied by that logical unit.
            - Do NOT invent lines or text. Only reference lines that exist in the input.
            - If a line is strong and needs no change, do not include it.
            - Score the resume across the category rubric below, each out of 100.

            What to evaluate (in priority order):
            1. Impact & metrics - are achievements quantified (%, time saved, scale, $)? Flag vague or unmeasured claims.
            2. Action verbs - flag weak/passive openers ("Responsible for", "Helped", "Worked on"); suggest strong verbs.
            3. Specificity - flag vague tech or hand-wavy descriptions; push for concrete tools, scale, and outcomes.
            4. Redundancy & filler - flag repeated verbs, buzzwords, or padding.
            5. Clarity & grammar - flag run-ons, tense inconsistency, awkward phrasing.
            6. ATS & formatting risks - flag anything that hurts parsing or readability.

            Scoring rubric - score EACH of these 0-100 (100 = exceptional, 0 = absent/poor). Be honest \
            and calibrated; most real resumes fall in the 55-80 range per category:
            - `impactAndQuantification`: how well achievements demonstrate measurable outcomes (metrics, scale, $, time).
            - `technicalDepth`: breadth and relevance of technologies, and evidence of real depth vs. buzzword listing.
            - `writingAndActionVerbs`: strength of verbs, concision, and absence of passive/filler phrasing.
            - `clarityAndReadability`: grammar, consistency, and how easy the resume is to skim.
            - `formattingAndAts`: structure, section clarity, and ATS-parse friendliness.
            - `relevanceAndSeniority`: how well the experience signals the candidate's level and fit for SWE roles.
            Also return `overallScore` (0-100) as a holistic weighted judgment, NOT a raw average - weight \
            impact and technical depth most heavily.

            Return JSON in EXACTLY this shape:
            {
              "scores": {
                "overallScore": 0,
                "categories": {
                  "impactAndQuantification": 0,
                  "technicalDepth": 0,
                  "writingAndActionVerbs": 0,
                  "clarityAndReadability": 0,
                  "formattingAndAts": 0,
                  "relevanceAndSeniority": 0
                }
              },
              "overallAssessment": {
                "summary": "2-3 sentence high-level assessment",
                "strengths": ["..."],
                "topPriorities": ["the 3 most impactful fixes"]
              },
              "suggestions": [
                {
                  "lineIndex": 0,
                  "lineIndexes": [0],
                  "originalText": "the complete targeted sentence or bullet",
                  "category": "impact | action_verb | specificity | redundancy | clarity | formatting",
                  "severity": "high | medium | low",
                  "issue": "what specifically is wrong with this bullet",
                  "suggestedChange": "the concrete rewritten version of the entire bullet",
                  "reason": "why this change improves the resume"
                }
              ]
            }

            Field rules for each suggestion:
            - `lineIndex` is the first visual line occupied by the logical unit.
            - `lineIndexes` contains every visual row occupied by that unit, in ascending order.
            - `originalText` is the complete logical unit with wrapped lines joined by spaces.
            - `suggestedChange` rewrites the entire logical unit, not one visual row.

            Order `suggestions` by severity, highest first.
            Respond with VALID JSON ONLY. No prose, no markdown, no code fences.""";

    private final ResumeTextExtractionService resumeTextExtractionService = new ResumeTextExtractionService();
    private final OpenAIClient openAIClient;
    private final ObjectMapper objectMapper;

    public ResumeAiReviewService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.openAIClient = OpenAIOkHttpClient.builder()
                .apiKey(API_KEY)
                .build();
    }

    public JsonNode review(MultipartFile file) throws IOException {
        List<LinePosition> lines = resumeTextExtractionService.extractText(file).getLines();
        String linesJson = objectMapper.writeValueAsString(lines);

        ResponseCreateParams params = ResponseCreateParams.builder()
                .input(SYSTEM_PROMPT + "\n\nRESUME LINES:\n" + linesJson)
                .model(MODEL)
                .build();

        Response response = openAIClient.responses().create(params);

        // Reasoning models emit a reasoning item before the message, so find the message
        // rather than assuming it is first.
        String modelJson = response.output().stream()
                .flatMap(item -> item.message().stream())
                .flatMap(message -> message.content().stream())
                .flatMap(content -> content.outputText().stream())
                .map(ResponseOutputText::text)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No text in model response"));

        ObjectNode review = (ObjectNode) objectMapper.readTree(modelJson);
        review.set("lines", objectMapper.valueToTree(lines));
        addHighlightGeometry(review, lines);
        return review;
    }

    private void addHighlightGeometry(ObjectNode review, List<LinePosition> lines) {
        Map<Integer, LinePosition> linesByIndex = lines.stream()
                .collect(Collectors.toMap(LinePosition::getIndex, Function.identity()));

        JsonNode suggestions = review.path("suggestions");
        if (!suggestions.isArray()) {
            return;
        }

        for (JsonNode suggestionNode : suggestions) {
            if (!(suggestionNode instanceof ObjectNode suggestion)) {
                continue;
            }

            ArrayNode rects = suggestion.putArray("rects");
            Set<Integer> lineIndexes = collectLineIndexes(suggestion);
            LinePosition firstLine = lineIndexes.stream()
                    .map(linesByIndex::get)
                    .filter(line -> line != null && line.getPageHeight() > 0)
                    .min(Comparator.comparing(LinePosition::getPageNumber)
                            .thenComparing(LinePosition::getY))
                    .orElse(null);

            if (firstLine != null) {
                suggestion.put("pageNumber", firstLine.getPageNumber());
                suggestion.put("startingY", firstLine.getY() / firstLine.getPageHeight());
            }

            for (Integer lineIndex : lineIndexes) {
                LinePosition line = linesByIndex.get(lineIndex);
                if (line == null || line.getPageWidth() <= 0 || line.getPageHeight() <= 0) {
                    continue;
                }

                ObjectNode rect = rects.addObject();
                rect.put("lineIndex", line.getIndex());
                rect.put("pageNumber", line.getPageNumber());
                rect.put("x", line.getX() / line.getPageWidth());
                rect.put("y", line.getY() / line.getPageHeight());
                rect.put("width", line.getWidth() / line.getPageWidth());
                rect.put("height", line.getHeight() / line.getPageHeight());
            }
        }
    }

    private Set<Integer> collectLineIndexes(ObjectNode suggestion) {
        Set<Integer> indexes = new LinkedHashSet<>();
        JsonNode lineIndexes = suggestion.path("lineIndexes");
        if (lineIndexes.isArray()) {
            for (JsonNode lineIndex : lineIndexes) {
                if (lineIndex.canConvertToInt()) {
                    indexes.add(lineIndex.asInt());
                }
            }
        }

        JsonNode firstLineIndex = suggestion.path("lineIndex");
        if (indexes.isEmpty() && firstLineIndex.canConvertToInt()) {
            indexes.add(firstLineIndex.asInt());
        }
        return indexes;
    }

    /**
     * Extracts resume text and per-line layout metadata from a PDF. Not a Spring bean; this
     * is an implementation detail of the review pipeline, not exposed via any endpoint.
     */
    private static final class ResumeTextExtractionService {

        private static final float LINE_TOLERANCE = 3.0f;

        RoastResponse extractText(MultipartFile file) throws IOException {
            try (PDDocument document = Loader.loadPDF(file.getBytes())) {
                PositionalTextStripper stripper = new PositionalTextStripper();
                // Drives the stripper pipeline so writeString collects the word positions.
                stripper.getText(document);

                List<LinePosition> lines = groupIntoLines(stripper.getWords());

                return new RoastResponse(lines);
            }
        }

        private List<LinePosition> groupIntoLines(List<WordPosition> words) {
            List<LinePosition> lines = new ArrayList<>();
            if (words.isEmpty()) {
                return lines;
            }

            List<WordPosition> sorted = new ArrayList<>(words);
            sorted.sort(Comparator.comparing(WordPosition::getPageNumber)
                    .thenComparing(WordPosition::getY)
                    .thenComparing(WordPosition::getX));

            List<WordPosition> currentLine = new ArrayList<>();
            for (WordPosition word : sorted) {
                if (currentLine.isEmpty()
                        || (word.getPageNumber() == currentLine.get(0).getPageNumber()
                        && Math.abs(word.getY() - currentLine.get(0).getY()) <= LINE_TOLERANCE)) {
                    currentLine.add(word);
                } else {
                    lines.add(buildLine(lines.size(), currentLine));
                    currentLine = new ArrayList<>();
                    currentLine.add(word);
                }
            }
            if (!currentLine.isEmpty()) {
                lines.add(buildLine(lines.size(), currentLine));
            }

            return lines;
        }

        private LinePosition buildLine(int index, List<WordPosition> lineWords) {
            WordPosition first = lineWords.get(0);

            String text = lineWords.stream()
                    .map(WordPosition::getText)
                    .collect(Collectors.joining(" "));

            float x = lineWords.stream().map(WordPosition::getX).min(Float::compare).orElse(first.getX());
            float y = lineWords.stream().map(WordPosition::getY).min(Float::compare).orElse(first.getY());
            float right = lineWords.stream()
                    .map(word -> word.getX() + word.getWidth())
                    .max(Float::compare)
                    .orElse(x);
            float bottom = lineWords.stream()
                    .map(word -> word.getY() + word.getHeight())
                    .max(Float::compare)
                    .orElse(y);
            float fontSize = first.getFontSize();

            return new LinePosition(
                    index,
                    first.getPageNumber(),
                    text,
                    x,
                    y,
                    right - x,
                    bottom - y,
                    fontSize,
                    first.getPageWidth(),
                    first.getPageHeight()
            );
        }
    }
}
