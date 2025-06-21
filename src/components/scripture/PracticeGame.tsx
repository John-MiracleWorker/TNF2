import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Check, 
  X, 
  Timer, 
  Target,
  Trophy,
  Star,
  Shuffle,
  Type,
  Keyboard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  generateFillInBlanks, 
  shuffleArray, 
  calculateAccuracy,
  PRACTICE_GAMES,
  POINTS
} from '@/lib/gamification';
import type { ScriptureMemory } from '@/lib/types';
import type { PracticeSession } from '@/lib/gamification';

interface PracticeGameProps {
  scripture: ScriptureMemory;
  gameType: string;
  onComplete: (session: PracticeSession) => void;
  onCancel: () => void;
}

export function PracticeGame({ scripture, gameType, onComplete, onCancel }: PracticeGameProps) {
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'paused' | 'completed'>('ready');
  const [startTime, setStartTime] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [userInput, setUserInput] = useState<string>('');
  const [gameData, setGameData] = useState<any>(null);
  const [mistakes, setMistakes] = useState<number>(0);
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(0);
  const { toast } = useToast();

  const game = PRACTICE_GAMES.find(g => g.id === gameType);
  const timeElapsed = Math.floor((currentTime - startTime) / 1000);

  useEffect(() => {
    if (gameState === 'playing') {
      const interval = setInterval(() => {
        setCurrentTime(Date.now());
      }, 100);
      return () => clearInterval(interval);
    }
  }, [gameState]);

  useEffect(() => {
    initializeGame();
  }, [gameType, scripture]);

  const initializeGame = () => {
    switch (gameType) {
      case 'fill-blanks':
        const blanksData = generateFillInBlanks(scripture.verse_text, 'medium');
        setGameData(blanksData);
        setUserInput('');
        break;
      
      case 'word-order':
        const words = scripture.verse_text.split(' ');
        setGameData({
          originalWords: words,
          shuffledWords: shuffleArray(words),
          userOrder: []
        });
        break;
      
      case 'typing-test':
        setGameData({ targetText: scripture.verse_text });
        setUserInput('');
        break;
      
      case 'multiple-choice':
        generateMultipleChoiceData();
        break;
      
      case 'first-letter':
        const firstLetters = scripture.verse_text.split(' ').map(word => word[0]).join(' ');
        setGameData({ hints: firstLetters, targetText: scripture.verse_text });
        setUserInput('');
        break;
    }
  };

  const generateMultipleChoiceData = () => {
    const words = scripture.verse_text.split(' ');
    const questionIndex = Math.floor(Math.random() * words.length);
    const correctWord = words[questionIndex];
    
    // Generate similar-looking wrong options
    const wrongOptions = [
      correctWord.slice(0, -1) + (correctWord.slice(-1) === 's' ? '' : 's'),
      correctWord.charAt(0).toUpperCase() + correctWord.slice(1).toLowerCase(),
      correctWord.length > 3 ? correctWord.slice(0, -2) + 'ed' : correctWord + 'ed'
    ].filter(option => option !== correctWord).slice(0, 2);
    
    const allOptions = shuffleArray([correctWord, ...wrongOptions]);
    
    setGameData({
      questionText: words.map((word, index) => 
        index === questionIndex ? '______' : word
      ).join(' '),
      correctAnswer: correctWord,
      options: allOptions,
      questionIndex
    });
  };

  const startGame = () => {
    setGameState('playing');
    setStartTime(Date.now());
    setCurrentTime(Date.now());
    setMistakes(0);
    setCurrentWordIndex(0);
  };

  const pauseGame = () => {
    setGameState('paused');
  };

  const resumeGame = () => {
    setGameState('playing');
    setStartTime(startTime + (Date.now() - currentTime));
  };

  const resetGame = () => {
    setGameState('ready');
    setMistakes(0);
    setCurrentWordIndex(0);
    initializeGame();
  };

  const completeGame = useCallback((accuracy: number) => {
    setGameState('completed');
    
    const timeSpent = Math.floor((currentTime - startTime) / 1000);
    let pointsEarned = POINTS.PRACTICE_COMPLETED;
    
    // Bonus points for high accuracy
    if (accuracy >= 1.0) pointsEarned += POINTS.PERFECT_ACCURACY;
    else if (accuracy >= 0.9) pointsEarned += 50;
    else if (accuracy >= 0.8) pointsEarned += 25;
    
    // Speed bonus
    if (timeSpent <= 30) pointsEarned += 50;
    else if (timeSpent <= 60) pointsEarned += 25;
    
    const session: PracticeSession = {
      scripture_memory_id: scripture.id!,
      practice_type: gameType as any,
      accuracy_score: accuracy,
      time_spent: timeSpent,
      points_earned: pointsEarned,
      mistakes_made: mistakes,
      completed: true
    };
    
    onComplete(session);
  }, [currentTime, startTime, mistakes, gameType, scripture.id, onComplete]);

  const handleGameAction = (action: string, data?: any) => {
    switch (gameType) {
      case 'fill-blanks':
        handleFillBlanksAction(action, data);
        break;
      case 'word-order':
        handleWordOrderAction(action, data);
        break;
      case 'typing-test':
        handleTypingTestAction(action, data);
        break;
      case 'multiple-choice':
        handleMultipleChoiceAction(action, data);
        break;
      case 'first-letter':
        handleFirstLetterAction(action, data);
        break;
    }
  };

  const handleFillBlanksAction = (action: string, data?: any) => {
    if (action === 'submit') {
      const userWords = userInput.toLowerCase().split(' ');
      const correctWords = gameData.blanks.map((word: string) => word.toLowerCase());
      
      let correctCount = 0;
      userWords.forEach((word, index) => {
        if (word === correctWords[index]) correctCount++;
      });
      
      const accuracy = correctCount / correctWords.length;
      completeGame(accuracy);
    }
  };

  const handleWordOrderAction = (action: string, data?: any) => {
    if (action === 'addWord') {
      const newOrder = [...gameData.userOrder, data];
      setGameData({ ...gameData, userOrder: newOrder });
      
      if (newOrder.length === gameData.originalWords.length) {
        const accuracy = calculateAccuracy(newOrder.join(' '), gameData.originalWords.join(' '));
        completeGame(accuracy);
      }
    } else if (action === 'removeWord') {
      const newOrder = gameData.userOrder.filter((_: any, index: number) => index !== data);
      setGameData({ ...gameData, userOrder: newOrder });
    }
  };

  const handleTypingTestAction = (action: string, data?: any) => {
    if (action === 'input') {
      setUserInput(data);
      
      // Check for completion
      if (data.length >= gameData.targetText.length) {
        const accuracy = calculateAccuracy(data, gameData.targetText);
        completeGame(accuracy);
      }
    }
  };

  const handleMultipleChoiceAction = (action: string, data?: any) => {
    if (action === 'select') {
      const accuracy = data === gameData.correctAnswer ? 1.0 : 0.0;
      if (accuracy < 1.0) setMistakes(mistakes + 1);
      completeGame(accuracy);
    }
  };

  const handleFirstLetterAction = (action: string, data?: any) => {
    if (action === 'submit') {
      const accuracy = calculateAccuracy(userInput, gameData.targetText);
      completeGame(accuracy);
    }
  };

  const renderGameContent = () => {
    if (!gameData) return null;

    switch (gameType) {
      case 'fill-blanks':
        return (
          <div className="space-y-4">
            <div className="bg-navy/5 rounded-lg p-4">
              <p className="text-lg font-mono leading-relaxed">{gameData.text}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Fill in the missing words:</label>
              <Input
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Enter the missing words separated by spaces"
                disabled={gameState !== 'playing'}
              />
            </div>
            {gameState === 'playing' && (
              <Button 
                onClick={() => handleGameAction('submit')}
                disabled={!userInput.trim()}
                className="w-full"
              >
                <Check className="mr-2 h-4 w-4" />
                Submit Answer
              </Button>
            )}
          </div>
        );

      case 'word-order':
        return (
          <div className="space-y-4">
            <div className="bg-navy/5 rounded-lg p-4">
              <p className="text-sm text-navy/70 mb-2">Arrange the words in the correct order:</p>
              <div className="flex flex-wrap gap-2 min-h-[40px] border-2 border-dashed border-navy/20 rounded p-2">
                {gameData.userOrder.map((word: string, index: number) => (
                  <Badge 
                    key={index}
                    variant="default"
                    className="cursor-pointer bg-navy text-cream hover:bg-navy/80"
                    onClick={() => handleGameAction('removeWord', index)}
                  >
                    {word} <X className="ml-1 h-3 w-3" />
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {gameData.shuffledWords
                .filter((word: string) => !gameData.userOrder.includes(word))
                .map((word: string, index: number) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleGameAction('addWord', word)}
                  disabled={gameState !== 'playing'}
                >
                  {word}
                </Button>
              ))}
            </div>
          </div>
        );

      case 'typing-test':
        return (
          <div className="space-y-4">
            <div className="bg-navy/5 rounded-lg p-4">
              <p className="text-sm text-navy/70 mb-2">Type the verse from memory:</p>
              <p className="text-lg font-serif text-navy/60 italic">{scripture.verse_reference}</p>
            </div>
            <textarea
              value={userInput}
              onChange={(e) => handleGameAction('input', e.target.value)}
              placeholder="Type the verse here..."
              className="w-full h-32 p-3 border rounded-lg resize-none"
              disabled={gameState !== 'playing'}
            />
            <div className="text-sm text-navy/60">
              Progress: {userInput.length} / {gameData.targetText.length} characters
            </div>
          </div>
        );

      case 'multiple-choice':
        return (
          <div className="space-y-4">
            <div className="bg-navy/5 rounded-lg p-4">
              <p className="text-lg font-mono leading-relaxed">{gameData.questionText}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Choose the correct word:</p>
              {gameData.options.map((option: string, index: number) => (
                <Button
                  key={index}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleGameAction('select', option)}
                  disabled={gameState !== 'playing'}
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>
        );

      case 'first-letter':
        return (
          <div className="space-y-4">
            <div className="bg-navy/5 rounded-lg p-4">
              <p className="text-sm text-navy/70 mb-2">Use the first letter hints to type the verse:</p>
              <p className="text-lg font-mono leading-relaxed">{gameData.hints}</p>
            </div>
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Type the full verse using the hints..."
              className="w-full h-32 p-3 border rounded-lg resize-none"
              disabled={gameState !== 'playing'}
            />
            {gameState === 'playing' && (
              <Button 
                onClick={() => handleGameAction('submit')}
                disabled={!userInput.trim()}
                className="w-full"
              >
                <Check className="mr-2 h-4 w-4" />
                Submit Answer
              </Button>
            )}
          </div>
        );

      default:
        return <div>Game type not implemented</div>;
    }
  };

  const getGameIcon = () => {
    switch (gameType) {
      case 'fill-blanks': return Type;
      case 'word-order': return Shuffle;
      case 'typing-test': return Keyboard;
      case 'multiple-choice': return Target;
      case 'first-letter': return Type;
      default: return Play;
    }
  };

  const GameIcon = getGameIcon();

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center">
              <GameIcon className="h-5 w-5 mr-2 text-gold" />
              {game?.name || 'Practice Game'}
            </CardTitle>
            <p className="text-navy/70 mt-1">{game?.description}</p>
            <div className="text-sm text-navy/60 mt-2">
              <strong>{scripture.verse_reference}</strong>
            </div>
          </div>
          <Badge variant="outline" className="bg-gold/10 text-gold">
            {game?.difficulty}
          </Badge>
        </div>
        
        {/* Game Stats */}
        <div className="flex items-center space-x-4 mt-4">
          <div className="flex items-center space-x-1 text-sm text-navy/70">
            <Timer className="h-4 w-4" />
            <span>{timeElapsed}s</span>
          </div>
          <div className="flex items-center space-x-1 text-sm text-navy/70">
            <X className="h-4 w-4" />
            <span>{mistakes} mistakes</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <AnimatePresence mode="wait">
          {gameState === 'ready' && (
            <motion.div
              key="ready"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8"
            >
              <div className="bg-gold/20 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <GameIcon className="h-8 w-8 text-gold" />
              </div>
              <h3 className="text-lg font-medium text-navy mb-2">Ready to Practice?</h3>
              <p className="text-navy/70 mb-6">{game?.description}</p>
              <div className="flex justify-center space-x-3">
                <Button onClick={startGame} className="bg-gold text-navy hover:bg-gold/90">
                  <Play className="mr-2 h-4 w-4" />
                  Start Game
                </Button>
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}

          {(gameState === 'playing' || gameState === 'paused') && (
            <motion.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {renderGameContent()}
              
              <div className="flex justify-center space-x-3 pt-4 border-t">
                {gameState === 'playing' ? (
                  <Button variant="outline\" onClick={pauseGame}>
                    <Pause className="mr-2 h-4 w-4" />
                    Pause
                  </Button>
                ) : (
                  <Button onClick={resumeGame} className="bg-gold text-navy hover:bg-gold/90">
                    <Play className="mr-2 h-4 w-4" />
                    Resume
                  </Button>
                )}
                <Button variant="outline" onClick={resetGame}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}

          {gameState === 'completed' && (
            <motion.div
              key="completed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8"
            >
              <div className="bg-green-500/20 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Trophy className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-navy mb-2">Game Complete!</h3>
              <p className="text-navy/70 mb-4">Great job practicing your scripture memory</p>
              
              <div className="flex justify-center space-x-6 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-navy">{timeElapsed}s</div>
                  <div className="text-sm text-navy/60">Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-navy">{mistakes}</div>
                  <div className="text-sm text-navy/60">Mistakes</div>
                </div>
              </div>
              
              <div className="flex justify-center space-x-3">
                <Button onClick={resetGame} className="bg-gold text-navy hover:bg-gold/90">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Play Again
                </Button>
                <Button variant="outline" onClick={onCancel}>
                  Done
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}