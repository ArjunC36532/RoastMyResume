package com.roastmyresume.api.model;

public class WordPosition {

    private int pageNumber;
    private String text;
    private float x;
    private float y;
    private float width;
    private float height;
    private float fontSize;
    private float pageWidth;
    private float pageHeight;

    public WordPosition(
            int pageNumber,
            String text,
            float x,
            float y,
            float width,
            float height,
            float fontSize,
            float pageWidth,
            float pageHeight
    ) {
        this.pageNumber = pageNumber;
        this.text = text;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.fontSize = fontSize;
        this.pageWidth = pageWidth;
        this.pageHeight = pageHeight;
    }

    public int getPageNumber() { return pageNumber; }
    public String getText() { return text; }
    public float getX() { return x; }
    public float getY() { return y; }
    public float getWidth() { return width; }
    public float getHeight() { return height; }
    public float getFontSize() { return fontSize; }
    public float getPageWidth() { return pageWidth; }
    public float getPageHeight() { return pageHeight; }

    public void setPageNumber(int pageNumber) { this.pageNumber = pageNumber; }
    public void setText(String text) { this.text = text; }
    public void setX(float x) { this.x = x; }
    public void setY(float y) { this.y = y; }
    public void setWidth(float width) { this.width = width; }
    public void setHeight(float height) { this.height = height; }
    public void setFontSize(float fontSize) { this.fontSize = fontSize; }
    public void setPageWidth(float pageWidth) { this.pageWidth = pageWidth; }
    public void setPageHeight(float pageHeight) { this.pageHeight = pageHeight; }
}
