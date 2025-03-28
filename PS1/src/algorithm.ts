import { Flashcard, AnswerDifficulty, BucketMap } from "./flashcards";
import { PracticeRecord, ProgressStats } from "../types";

/**
 * Transforms bucket collection into an indexed array representation
 */
export function extractBucketArray(bucketCollection: BucketMap): Array<Set<Flashcard>> {
  const bucketIndex: Array<Set<Flashcard>> = [];
  
  // Determine maximum bucket tier
  const highestTier = Math.max(...Array.from(bucketCollection.keys()), 0);
  
  // Populate array with empty sets
  for (let tier = 0; tier <= highestTier; tier++) {
    bucketIndex.push(new Set<Flashcard>());
  }
  
  // Populate sets from bucket map
  for (const [tier, cardSet] of bucketCollection.entries()) {
    bucketIndex[tier] = new Set(cardSet);
  }
  
  return bucketIndex;
}

/**
 * Intelligent card selection algorithm for learning session
 */
export function selectLearningCards(
  cardBuckets: Array<Set<Flashcard>>, 
  learningDay: number
): Set<Flashcard> {
  const selectedCards = new Set<Flashcard>();
  
  // Mandatory new card practice
  if (cardBuckets[0]) {
    cardBuckets[0].forEach(card => selectedCards.add(card));
  }
  
  // Dynamic interval-based card selection
  for (let bucketTier = 1; bucketTier < cardBuckets.length; bucketTier++) {
    const learningInterval = Math.pow(2, bucketTier);
    
    if (learningDay % learningInterval === 0 && cardBuckets[bucketTier]) {
      cardBuckets[bucketTier].forEach(card => selectedCards.add(card));
    }
  }
  
  return selectedCards;
}

/**
 * Adaptive bucket management for card progression
 */
export function recalibrateBuckets(
  currentBuckets: BucketMap,
  targetCard: Flashcard,
  performanceLevel: AnswerDifficulty
): BucketMap {
  const refreshedBuckets = new Map<number, Set<Flashcard>>();
  
  // Deep copy existing bucket structure
  for (const [tier, cardGroup] of currentBuckets.entries()) {
    refreshedBuckets.set(tier, new Set(cardGroup));
  }
  
  // Locate current card's tier
  let currentTier = -1;
  for (const [tier, cardSet] of refreshedBuckets.entries()) {
    if (cardSet.has(targetCard)) {
      currentTier = tier;
      cardSet.delete(targetCard);
      break;
    }
  }
  
  // Default tier initialization
  if (currentTier === -1) {
    refreshedBuckets.set(0, new Set());
    currentTier = 0;
  }
  
  // Tier progression logic
  let newTier: number;
  switch (performanceLevel) {
    case AnswerDifficulty.Wrong:
      newTier = 0;
      break;
    case AnswerDifficulty.Hard:
      newTier = currentTier;
      break;
    default:
      newTier = currentTier + 1;
  }
  
  // Ensure destination tier exists
  if (!refreshedBuckets.has(newTier)) {
    refreshedBuckets.set(newTier, new Set());
  }
  
  // Relocate card
  refreshedBuckets.get(newTier)!.add(targetCard);
  
  return refreshedBuckets;
}

/**
 * Context-aware hint retrieval
 */
export function deriveCardHint(card: Flashcard): string {
  return card.hint ?? "No contextual guidance available for this card.";
}

/**
 * Comprehensive learning analytics
 */
export function analyzeLearningProgress(
  cardBuckets: BucketMap, 
  learningHistory: PracticeRecord[]
): ProgressStats {
  const bucketDistribution: Record<number, number> = {};
  let totalCardCount = 0;
  
  // Card distribution analysis
  for (const [tier, cardSet] of cardBuckets.entries()) {
    totalCardCount += cardSet.size;
    bucketDistribution[tier] = cardSet.size;
  }
  
  // Normalize bucket representation
  const maxTier = Math.max(...Object.keys(bucketDistribution).map(Number), 0);
  for (let tier = 0; tier <= maxTier; tier++) {
    bucketDistribution[tier] = bucketDistribution[tier] || 0;
  }
  
  // Performance metrics calculation
  const totalAttempts = learningHistory.length;
  const successfulAttempts = learningHistory.filter(
    record => 
      record.difficulty === AnswerDifficulty.Easy || 
      record.difficulty === AnswerDifficulty.Hard
  ).length;
  
  const successPercentage = 
    totalAttempts > 0 ? (successfulAttempts / totalAttempts) * 100 : 0;
  
  // Card movement complexity tracking
  const cardMovementLog: Record<string, number> = {};
  learningHistory.forEach(record => {
    const cardIdentifier = `${record.cardFront}:${record.cardBack}`;
    cardMovementLog[cardIdentifier] = (cardMovementLog[cardIdentifier] || 0) + 1;
  });
  
  const averageCardMovement = 
    Object.keys(cardMovementLog).length > 0
      ? Object.values(cardMovementLog).reduce((sum, moves) => sum + moves, 0) / 
        Object.keys(cardMovementLog).length
      : 0;
  
  return {
    totalCards: totalCardCount,
    cardsByBucket: bucketDistribution,
    successRate: successPercentage,
    averageMovesPerCard: averageCardMovement,
    totalPracticeEvents: totalAttempts
  };
}