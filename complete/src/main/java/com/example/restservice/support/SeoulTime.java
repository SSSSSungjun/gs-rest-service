package com.example.restservice.support;

import java.time.LocalDateTime;
import java.time.ZoneId;

public final class SeoulTime {
    private static final ZoneId SEOUL_ZONE = ZoneId.of("Asia/Seoul");

    private SeoulTime() {
    }

    public static LocalDateTime now() {
        return LocalDateTime.now(SEOUL_ZONE);
    }
}
