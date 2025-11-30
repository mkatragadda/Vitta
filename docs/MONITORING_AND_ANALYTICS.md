# Monitoring and Analytics Setup Guide

## Overview

This guide covers setting up production monitoring, analytics, error tracking, and performance monitoring for Vitta PWA.

## Architecture

```
Application
    ↓
Error Tracking (Sentry)
Performance Monitoring (Web Vitals)
Analytics (Google Analytics)
Logging (Server Logs)
    ↓
Dashboards & Alerts
```

## Error Tracking with Sentry

### Setup

1. **Create Sentry Account**
   - Go to [sentry.io](https://sentry.io)
   - Sign up or login
   - Create new organization
   - Create new project → Select "Next.js"

2. **Get Sentry DSN**
   - Go to Settings → Projects → Vitta
   - Copy DSN (Data Source Name)
   - Format: `https://xxxxx@o12345.ingest.sentry.io/67890`

3. **Install Sentry SDK**
   ```bash
   npm install @sentry/nextjs
   ```

4. **Initialize in Next.js**

   Create `sentry.client.config.js`:
   ```javascript
   import * as Sentry from "@sentry/nextjs";

   Sentry.init({
     dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
     environment: process.env.NEXT_ENV,
     tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
     debug: process.env.NODE_ENV !== "production",
   });
   ```

   Create `sentry.server.config.js`:
   ```javascript
   import * as Sentry from "@sentry/nextjs";

   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: process.env.NEXT_ENV,
     tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
   });
   ```

   Update `pages/_app.js`:
   ```javascript
   import * as Sentry from "@sentry/nextjs";
   import App from "next/app";

   class MyApp extends App {
     render() {
       const { Component, pageProps } = this.props;
       return <Component {...pageProps} />;
     }
   }

   export default Sentry.withProfiler(MyApp);
   ```

5. **Add Environment Variables**
   ```bash
   NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@o12345.ingest.sentry.io/67890
   SENTRY_DSN=https://xxxxx:yyyy@o12345.ingest.sentry.io/67890
   SENTRY_ORG=your-org
   SENTRY_PROJECT=vitta
   SENTRY_AUTH_TOKEN=your-token
   NEXT_ENV=production
   ```

### Error Tracking Implementation

**Capture Errors Automatically:**
- JavaScript errors automatically reported
- Network errors captured
- API errors tracked
- Performance issues logged

**Manually Capture Errors:**
```javascript
import * as Sentry from "@sentry/nextjs";

try {
  // Code that might fail
  await syncManager.processQueue();
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      component: "sync-manager",
      operation: "processQueue"
    },
    extra: {
      queueLength: syncManager.getQueueLength()
    }
  });
}
```

**Breadcrumbs for Context:**
```javascript
Sentry.captureMessage("User went offline", "info");
Sentry.addBreadcrumb({
  category: "sync",
  message: "Starting queue processing",
  level: "debug",
  data: {
    queueLength: 5,
    operations: ["message", "card_add"]
  }
});
```

### Sentry Dashboard

**Key Features:**
- Real-time error monitoring
- Error grouping and deduplication
- Release tracking
- Performance monitoring
- Alerts and notifications

**Monitoring Checklist:**
- [ ] Error rate < 1%
- [ ] P95 latency acceptable
- [ ] No critical unresolved errors
- [ ] Release health > 90%
- [ ] Alert thresholds configured
- [ ] Team notifications setup

## Google Analytics

### Setup

1. **Create Analytics Account**
   - Go to [analytics.google.com](https://analytics.google.com)
   - Create new property
   - Select "Web"
   - Enter domain: yourdomain.com
   - Copy Measurement ID: `G-XXXXXXXXXX`

2. **Install Analytics Library**
   ```bash
   npm install @react-ga/core @react-ga/hooks
   ```

3. **Initialize in App**

   Create `services/analytics/analyticsService.js`:
   ```javascript
   import ReactGA from "@react-ga/core";

   export const initializeAnalytics = () => {
     ReactGA.initialize(process.env.NEXT_PUBLIC_GA_ID);
   };

   export const trackPageView = (path) => {
     ReactGA.pageview(path);
   };

   export const trackEvent = (category, action, label, value) => {
     ReactGA.event({
       category,
       action,
       label,
       value
     });
   };

   export const trackException = (description, fatal = false) => {
     ReactGA.exception({
       description,
       fatal
     });
   };
   ```

   In `pages/_app.js`:
   ```javascript
   import { initializeAnalytics } from "../services/analytics/analyticsService";

   useEffect(() => {
     initializeAnalytics();
   }, []);
   ```

4. **Add Environment Variable**
   ```bash
   NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
   ```

### Event Tracking

**Track User Actions:**
```javascript
import { trackEvent } from "../services/analytics/analyticsService";

// Chat message
trackEvent("chat", "message_sent", "offline_queue");

// Card operations
trackEvent("cards", "card_added", "new_card");
trackEvent("cards", "card_updated", "balance_update");

// Sync operations
trackEvent("sync", "sync_started", "online");
trackEvent("sync", "sync_completed", "5_operations");
trackEvent("sync", "sync_failed", "retry_exceeded");

// Authentication
trackEvent("auth", "login_success", "google");
trackEvent("auth", "logout", "user_action");
```

**Custom User Properties:**
```javascript
ReactGA.set({
  "user_type": "free",
  "cards_count": "3",
  "last_sync": new Date().toISOString()
});
```

### Analytics Dashboard

**Key Metrics:**
- Active users (daily/weekly)
- Session duration
- Bounce rate
- Feature usage
- Error rates
- Conversion funnel

**Custom Reports:**
- Offline usage patterns
- Sync success rates
- Card operations flow
- Chat engagement
- Mobile vs desktop usage

## Performance Monitoring

### Web Vitals Tracking

**Install Web Vitals Library:**
```bash
npm install web-vitals
```

**Track Core Web Vitals:**

Create `services/analytics/webVitalsService.js`:
```javascript
import {
  getCLS,
  getFCP,
  getFID,
  getLCP,
  getTTFB,
} from "web-vitals";

export const trackWebVitals = () => {
  // Cumulative Layout Shift
  getCLS((metric) => {
    console.log("CLS:", metric.value);
    reportMetric("CLS", metric.value);
  });

  // First Contentful Paint
  getFCP((metric) => {
    console.log("FCP:", metric.value);
    reportMetric("FCP", metric.value);
  });

  // First Input Delay
  getFID((metric) => {
    console.log("FID:", metric.value);
    reportMetric("FID", metric.value);
  });

  // Largest Contentful Paint
  getLCP((metric) => {
    console.log("LCP:", metric.value);
    reportMetric("LCP", metric.value);
  });

  // Time to First Byte
  getTTFB((metric) => {
    console.log("TTFB:", metric.value);
    reportMetric("TTFB", metric.value);
  });
};

const reportMetric = (name, value) => {
  // Send to analytics
  console.log(`[WebVitals] ${name}: ${value}ms`);
};
```

### Lighthouse CI

**Setup Automated Performance Testing:**

1. **Install Lighthouse CI**
   ```bash
   npm install -g @lhci/cli@*
   ```

2. **Create `lighthouserc.json`**
   ```json
   {
     "ci": {
       "collect": {
         "numberOfRuns": 3,
         "url": ["http://localhost:3000"]
       },
       "upload": {
         "target": "temporary-public-storage"
       },
       "assert": {
         "preset": "lighthouse:recommended",
         "assertions": {
           "categories:performance": ["error", { "minScore": 0.8 }],
           "categories:accessibility": ["error", { "minScore": 0.9 }],
           "categories:best-practices": ["error", { "minScore": 0.9 }],
           "categories:seo": ["error", { "minScore": 0.9 }]
         }
       }
     }
   }
   ```

3. **Add to CI Pipeline**
   ```bash
   # In GitHub Actions or similar
   lhci autorun
   ```

### Real User Monitoring (RUM)

**Track Production Performance:**

```javascript
// In your app
const perfObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log("Performance Entry:", entry);
    // Send to analytics backend
    if (entry.duration > 1000) {
      reportSlowOperation(entry.name, entry.duration);
    }
  }
});

perfObserver.observe({ entryTypes: ["measure", "navigation", "resource"] });
```

## Logging

### Server Logging

**Setup Structured Logging:**

Create `services/logging/loggerService.js`:
```javascript
class Logger {
  log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...data
    };
    console.log(JSON.stringify(logEntry));
  }

  info(message, data) {
    this.log("INFO", message, data);
  }

  error(message, data) {
    this.log("ERROR", message, data);
  }

  warn(message, data) {
    this.log("WARN", message, data);
  }

  debug(message, data) {
    this.log("DEBUG", message, data);
  }
}

export default new Logger();
```

**Use in API Routes:**
```javascript
import logger from "../../services/logging/loggerService";

export default async function handler(req, res) {
  logger.info("Chat request received", {
    userId: req.body.userId,
    messageLength: req.body.message.length
  });

  try {
    // Process request
    logger.info("Chat response sent", {
      responseTime: Date.now() - startTime
    });
  } catch (error) {
    logger.error("Chat API error", {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: error.message });
  }
}
```

### Log Aggregation

**CloudWatch Logs (AWS):**
```javascript
const AWS = require("aws-sdk");
const cloudwatch = new AWS.CloudWatch();

const putMetricData = async (metricName, value) => {
  await cloudwatch.putMetricData({
    Namespace: "Vitta",
    MetricData: [
      {
        MetricName: metricName,
        Value: value,
        Unit: "Count"
      }
    ]
  }).promise();
};
```

**Stackdriver (GCP):**
```javascript
const Logging = require("@google-cloud/logging");
const logging = new Logging();
const log = logging.log("vitta");

const metadata = {
  resource: {
    type: "global",
  },
  severity: "INFO",
};

log.write(log.entry(metadata, "Message content"));
```

**ELK Stack (Self-hosted):**
```javascript
const elasticsearch = require("@elastic/elasticsearch");
const client = new elasticsearch.Client({
  node: process.env.ELASTICSEARCH_URL
});

await client.index({
  index: "vitta-logs",
  body: {
    timestamp: new Date(),
    message: "User action",
    userId: userId,
    action: "sync"
  }
});
```

## Alerts and Notifications

### Alert Configuration

**Sentry Alerts:**
1. Go to Settings → Alerts
2. Create alert rules:
   - Error rate exceeds 5%
   - Performance degradation
   - Release health < 95%
   - New error in production

**Google Analytics Alerts:**
1. Go to Admin → Alerts
2. Create custom alerts:
   - Traffic spike (> 2x normal)
   - Traffic drop (< 50% normal)
   - Conversion rate changes

### Slack Integration

**Sentry to Slack:**
1. Go to Integrations → Slack
2. Connect workspace
3. Select channel
4. Configure notification rules

**Alert Message Example:**
```
🚨 High Error Rate
Production environment
Error rate: 5.2% (threshold: 5%)
Errors in last hour: 127
Top error: "API error: 503"
Action: Review Sentry dashboard
```

### Email Alerts

**Configure Critical Alerts:**
- High error rate (> 5%)
- High latency (> 3s p95)
- Service worker failures
- Sync failures (> 20%)
- Database connection errors

## Dashboards

### Grafana Dashboard Setup

**Install Prometheus:**
```bash
# Monitor application metrics
npm install prom-client
```

**Create Custom Dashboard:**
```javascript
import client from "prom-client";

const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_ms",
  help: "Duration of HTTP requests in ms",
  labelNames: ["method", "route", "status_code"],
});

const errorCounter = new client.Counter({
  name: "errors_total",
  help: "Total errors",
  labelNames: ["type", "component"],
});

export { httpRequestDuration, errorCounter };
```

**Expose Metrics:**
```javascript
app.get("/metrics", (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(client.register.metrics());
});
```

### Custom Dashboards

**Create Monitoring Dashboard:**

1. **Real-time Metrics:**
   - Active users
   - Error rate
   - API latency
   - Sync success rate
   - Offline users

2. **Historical Trends:**
   - Daily active users
   - Error rate trend
   - Performance degradation
   - Feature adoption

3. **Business Metrics:**
   - User retention
   - Feature engagement
   - Average session duration
   - Conversion rates

## Monitoring Checklist

### Daily Checks
- [ ] Error rate < 1%
- [ ] No critical unresolved errors
- [ ] API latency < 500ms
- [ ] Sync success rate > 99%
- [ ] No data loss reports

### Weekly Checks
- [ ] Review error trends
- [ ] Check performance trends
- [ ] Monitor quota usage
- [ ] Review user feedback
- [ ] Validate backups

### Monthly Checks
- [ ] Full system audit
- [ ] Capacity planning
- [ ] Cost optimization
- [ ] Security review
- [ ] Update monitoring rules

## Key Metrics to Monitor

### Availability
- Uptime: Target > 99.5%
- Service worker registration rate
- API endpoint availability
- Database connectivity

### Performance
- Response time (p50, p95, p99)
- First Contentful Paint: < 2.5s
- Largest Contentful Paint: < 4s
- Cumulative Layout Shift: < 0.1

### Error Rates
- JavaScript errors: < 0.5%
- API errors: < 0.1%
- Network errors: < 0.2%
- Unhandled rejections: 0

### Business Metrics
- Daily Active Users
- Chat messages sent
- Cards added
- Sync operations completed
- User retention rate

### Infrastructure
- CPU usage: < 70%
- Memory usage: < 80%
- Disk usage: < 85%
- Network bandwidth
- Database connections

## Incident Response

### Critical Alert Response

**When High Error Rate Alert Fires:**
1. Check Sentry dashboard
2. Identify error pattern
3. Review recent deployments
4. Check error frequency
5. Decide: Continue monitoring or rollback

**When Performance Degradation Alert:**
1. Check API latency
2. Review database queries
3. Check external API status
4. Verify CDN status
5. Scale if necessary

### Escalation Path
- Tier 1: Monitor and log
- Tier 2: Page on-call engineer
- Tier 3: Escalate to team lead
- Tier 4: Consider rollback

## Best Practices

1. **Sample Production Errors**
   - Sample 10-20% of errors to reduce noise
   - Increase sampling for critical paths
   - Monitor 100% of errors in staging

2. **Privacy & Compliance**
   - Don't log personally identifiable information
   - Respect GDPR/CCPA requirements
   - Encrypt logs in transit
   - Implement log retention policies

3. **Alert Fatigue**
   - Avoid too many alerts
   - Set meaningful thresholds
   - Create runbooks for each alert
   - Review and disable stale alerts

4. **Documentation**
   - Document what each metric means
   - Create runbooks for common issues
   - Keep dashboards updated
   - Document alert thresholds

## Tools Reference

| Tool | Purpose | Setup Time | Cost |
|------|---------|-----------|------|
| Sentry | Error tracking | 15 min | Free - $99/mo |
| Google Analytics | User analytics | 10 min | Free |
| Datadog | APM & Infrastructure | 30 min | $15-100/month |
| Grafana | Custom dashboards | 60 min | Free - $40/month |
| CloudWatch | AWS monitoring | 30 min | Pay as you go |
| Papertrail | Log aggregation | 15 min | $7-100/month |

## Next Steps

1. Deploy Sentry to production
2. Setup Google Analytics
3. Create initial dashboards
4. Configure critical alerts
5. Train team on alert response
6. Schedule regular monitoring reviews
