package com.roastmyresume.api.text;

import com.roastmyresume.api.model.WordPosition;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.TextPosition;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class PositionalTextStripper extends PDFTextStripper {

    private final List<WordPosition> words = new ArrayList<>();

    public PositionalTextStripper() throws IOException {
        super();
    }

    @Override
    protected void writeString(String text, List<TextPosition> textPositions) throws IOException {
        if (textPositions.isEmpty()) return;

        TextPosition first = textPositions.get(0);
        float x = Float.MAX_VALUE;
        float y = Float.MAX_VALUE;
        float right = Float.MIN_VALUE;
        float bottom = Float.MIN_VALUE;

        for (TextPosition position : textPositions) {
            float positionX = position.getXDirAdj();
            float positionY = position.getYDirAdj();
            x = Math.min(x, positionX);
            y = Math.min(y, positionY);
            right = Math.max(right, positionX + position.getWidthDirAdj());
            bottom = Math.max(bottom, positionY + position.getHeightDir());
        }

        float width    = right - x;
        float height   = bottom - y;
        float fontSize = first.getFontSizeInPt();

        words.add(new WordPosition(
                getCurrentPageNo(),
                text,
                x,
                y,
                width,
                height,
                fontSize,
                first.getPageWidth(),
                first.getPageHeight()
        ));

        super.writeString(text, textPositions);
    }

    public List<WordPosition> getWords() {
        return words;
    }
}
