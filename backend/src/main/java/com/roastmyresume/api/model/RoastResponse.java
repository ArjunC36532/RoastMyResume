package com.roastmyresume.api.model;

import java.util.List;

public class RoastResponse {

    private List<LinePosition> lines;

    public RoastResponse(List<LinePosition> lines) {
        this.lines = lines;
    }

    public List<LinePosition> getLines() {
        return lines;
    }

    public void setLines(List<LinePosition> lines) {
        this.lines = lines;
    }
}
