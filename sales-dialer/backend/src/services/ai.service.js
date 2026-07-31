/**
 * AI Service - Mocked AI functionality for call notes analysis
 * In production, this would connect to OpenAI or similar service
 */
class AIService {
  /**
   * Generate a summary for call note content
   * @param {string} content - The original note content
   * @returns {string} AI-generated summary
   */
  static generateSummary(content) {
    const lowerContent = content.toLowerCase();
    let summary = '';

    // Keyword-based classification
    if (this.containsAny(lowerContent, ['interested', 'yes', 'great', 'love', 'perfect', 'awesome', 'excellent'])) {
      summary = this.positiveTemplate();
    } else if (this.containsAny(lowerContent, ['not interested', 'decline', 'no thanks', 'don\'t need', 'not for us'])) {
      summary = this.negativeTemplate();
    } else if (this.containsAny(lowerContent, ['callback', 'follow up', 'call back', 'next week', 'later', 'revisit'])) {
      summary = this.followupTemplate();
    } else if (this.containsAny(lowerContent, ['meeting', 'demo', 'presentation', 'schedule', 'appointment'])) {
      summary = this.meetingTemplate();
    } else {
      summary = this.genericTemplate();
    }

    return `${summary}\n\n[AI Generated - ${new Date().toLocaleDateString()}]`;
  }

  /**
   * Analyze sentiment of call note content
   * @param {string} content - The note content
   * @returns {string} 'positive' | 'neutral' | 'negative'
   */
  static analyzeSentiment(content) {
    const lowerContent = content.toLowerCase();

    const positiveWords = [
      'interested', 'great', 'excellent', 'yes', 'love', 'perfect',
      'absolutely', 'amazing', 'awesome', 'fantastic', 'wonderful',
      'happy', 'excited', 'eager', 'ready', 'definitely', 'sounds good'
    ];

    const negativeWords = [
      'not', 'no', 'don\'t', 'won\'t', 'can\'t', 'never', 'busy',
      'expensive', 'later', 'maybe', 'perhaps', 'decline', 'wrong',
      'bad', 'terrible', 'awful', 'disappointed', 'frustrated'
    ];

    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach((word) => {
      if (lowerContent.includes(word)) positiveCount++;
    });

    negativeWords.forEach((word) => {
      if (lowerContent.includes(word)) negativeCount++;
    });

    // Account for negation patterns
    const negationPatterns = ['not interested', 'not sure', 'not a good', 'no thanks'];
    negationPatterns.forEach((pattern) => {
      if (lowerContent.includes(pattern)) {
        positiveCount--;
        negativeCount++;
      }
    });

    if (positiveCount > negativeCount) {
      return 'positive';
    } else if (negativeCount > positiveCount) {
      return 'negative';
    }
    return 'neutral';
  }

  /**
   * Extract key topics from content
   * @param {string} content - The note content
   * @returns {Array<string>} Array of key topics
   */
  static extractTopics(content) {
    const lowerContent = content.toLowerCase();
    const topics = [];

    const topicKeywords = {
      pricing: ['price', 'pricing', 'cost', 'expensive', 'budget', 'afford'],
      features: ['feature', 'functionality', 'capabilities', 'options', 'tools'],
      timeline: ['timeline', 'deadline', 'schedule', 'when', 'q1', 'q2', 'q3', 'q4'],
      competition: ['competitor', 'alternative', 'other', 'compared', 'vs'],
      implementation: ['implement', 'integration', 'setup', 'technical', 'development'],
      demo: ['demo', 'presentation', 'show', 'walkthrough', 'trial'],
    };

    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some((kw) => lowerContent.includes(kw))) {
        topics.push(topic);
      }
    });

    return topics;
  }

  /**
   * Check if content contains any of the given keywords
   * @param {string} content - Content to search
   * @param {Array<string>} keywords - Keywords to find
   * @returns {boolean}
   */
  static containsAny(content, keywords) {
    return keywords.some((keyword) => content.includes(keyword));
  }

  /**
   * Positive sentiment template
   * @returns {string}
   */
  static positiveTemplate() {
    const templates = [
      'Customer expressed strong interest in the product. Key areas of enthusiasm include features and pricing. Recommended action: Schedule a follow-up call within 48 hours to discuss next steps and provide additional information.',
      'Positive engagement detected. Customer showed interest and asked detailed questions about implementation. Next step: Send detailed proposal and schedule a product demo.',
      'Highly promising interaction. Customer indicated readiness to move forward. Action items: Prepare customized quote and establish timeline for evaluation.',
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Negative sentiment template
   * @returns {string}
   */
  static negativeTemplate() {
    const templates = [
      'Customer declined the offer. Primary concerns appear to be related to pricing or timing. Recommendation: Remove from active pipeline and re-engage in 6 months with updated pricing or special offer.',
      'Customer expressed lack of interest at this time. Budget constraints or competing priorities were mentioned. Action: Mark as "Not Interested" and archive for future re-engagement.',
      'Call concluded without positive outcome. Customer did not show interest or indicated alternative solutions. Recommendation: Close as lost and add to quarterly review list.',
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Follow-up required template
   * @returns {string}
   */
  static followupTemplate() {
    const templates = [
      'Customer requested a callback or follow-up conversation. Primary action: Schedule follow-up call for the requested time. Prepare additional information as requested.',
      'Follow-up needed. Customer indicated interest but needs more time to evaluate or consult with stakeholders. Next step: Set reminder for callback and send supplementary materials.',
      'Callback scheduled or requested. Customer wants to discuss further after internal review. Action items: Prepare case studies, send competitive comparison, and confirm callback time.',
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Meeting/demo scheduled template
   * @returns {string}
   */
  static meetingTemplate() {
    const templates = [
      'Meeting or demo scheduled as a result of this call. Key discussion points to prepare: product overview, pricing discussion, and implementation timeline. Action: Send calendar invite with agenda.',
      'Customer agreed to a presentation or demo. Prior to meeting: Prepare customized presentation deck, gather relevant case studies, and confirm attendee list.',
      'Follow-up meeting arranged. Customer will present our solution to their team. Recommended: Schedule pre-meeting call to align on messaging and handle objections.',
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Generic/neutral template
   * @returns {string}
   */
  static genericTemplate() {
    const templates = [
      'Standard call completed. Review notes for action items and next steps. Ensure all follow-up activities are logged and scheduled appropriately.',
      'Call concluded with general discussion. Next steps not clearly defined. Action: Reach out within 24 hours to clarify next steps and schedule follow-up if appropriate.',
      'General inquiry or information gathering call. No immediate commitment or clear next steps identified. Recommendation: Add to nurture sequence and follow up in 2 weeks.',
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }
}

module.exports = AIService;
