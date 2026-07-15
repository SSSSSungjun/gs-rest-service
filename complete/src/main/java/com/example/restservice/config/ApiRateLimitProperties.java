package com.example.restservice.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
@ConfigurationProperties(prefix = "app.rate-limit")
public class ApiRateLimitProperties {

    private boolean enabled;
    private Duration staleAfter = Duration.ofHours(1);
    private final AiRule ai = new AiRule(3, 10, Duration.ofMinutes(10), 2, 200);
    private final Rule content = new Rule(20, 100, Duration.ofMinutes(1));
    private final Rule upload = new Rule(10, 30, Duration.ofMinutes(10));
    private final Rule interaction = new Rule(120, 600, Duration.ofMinutes(1));

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public Duration getStaleAfter() {
        return staleAfter;
    }

    public void setStaleAfter(Duration staleAfter) {
        this.staleAfter = staleAfter;
    }

    public AiRule getAi() {
        return ai;
    }

    public Rule getContent() {
        return content;
    }

    public Rule getUpload() {
        return upload;
    }

    public Rule getInteraction() {
        return interaction;
    }

    public static class Rule {
        private int sessionLimit;
        private int ipLimit;
        private Duration window;

        public Rule() {
        }

        public Rule(int sessionLimit, int ipLimit, Duration window) {
            this.sessionLimit = sessionLimit;
            this.ipLimit = ipLimit;
            this.window = window;
        }

        public int getSessionLimit() {
            return sessionLimit;
        }

        public void setSessionLimit(int sessionLimit) {
            this.sessionLimit = sessionLimit;
        }

        public int getIpLimit() {
            return ipLimit;
        }

        public void setIpLimit(int ipLimit) {
            this.ipLimit = ipLimit;
        }

        public Duration getWindow() {
            return window;
        }

        public void setWindow(Duration window) {
            this.window = window;
        }
    }

    public static class AiRule extends Rule {
        private int maxConcurrent;
        private int dailyLimit;

        public AiRule() {
        }

        public AiRule(
                int sessionLimit,
                int ipLimit,
                Duration window,
                int maxConcurrent,
                int dailyLimit
        ) {
            super(sessionLimit, ipLimit, window);
            this.maxConcurrent = maxConcurrent;
            this.dailyLimit = dailyLimit;
        }

        public int getMaxConcurrent() {
            return maxConcurrent;
        }

        public void setMaxConcurrent(int maxConcurrent) {
            this.maxConcurrent = maxConcurrent;
        }

        public int getDailyLimit() {
            return dailyLimit;
        }

        public void setDailyLimit(int dailyLimit) {
            this.dailyLimit = dailyLimit;
        }
    }
}
