import { useState, useEffect, useCallback } from 'react';
import { getSudoku } from 'sudoku-gen';
import confetti from 'canvas-confetti';
import { RefreshCw, Eraser, Trophy, Globe, Play, Pause, Moon, Sun, Volume2, VolumeX, Pencil, Lightbulb, Undo2, RotateCcw, Plus, Flame } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, useMotionTemplate } from 'motion/react';
import { cn } from './lib/utils';

const createRipple = (event: React.MouseEvent<HTMLElement> | React.PointerEvent<HTMLElement>) => {
  const button = event.currentTarget;
  const circle = document.createElement("span");
  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const radius = diameter / 2;
  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${event.clientX - button.getBoundingClientRect().left - radius}px`;
  circle.style.top = `${event.clientY - button.getBoundingClientRect().top - radius}px`;
  circle.classList.add("ripple");
  button.appendChild(circle);
  setTimeout(() => circle.remove(), 600);
};

type Cell = {
  value: string | null;
  isGiven: boolean;
  isError: boolean;
  notes: number[];
};

type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';
type Language = 'cs' | 'en';
type Theme = 'light' | 'dark' | 'biker';

const translations = {
  en: {
    title: 'Sudoku',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    expert: 'Expert',
    newGame: 'New Game',
    solved: 'Puzzle Solved!',
    solvedDesc: (diff: string, time: string) => `Great job completing the ${diff} difficulty in ${time}.`,
    instructions: 'Use your keyboard, arrow keys, or the number pad below to play.',
    erase: 'Erase',
    undo: 'Undo',
    notes: 'Notes',
    hint: 'Hint',
    mistakes: 'Mistakes',
    time: 'Time',
    paused: 'Paused',
    resume: 'Resume',
    gameOver: 'Game Over',
    outOfLives: 'You made 3 mistakes.',
    bestTime: 'Best',
    restart: 'Restart',
    restartConfirm: 'Restart this puzzle?',
    yes: 'Yes',
    no: 'No',
  },
  cs: {
    title: 'Sudoku',
    easy: 'Lehké',
    medium: 'Střední',
    hard: 'Těžké',
    expert: 'Expert',
    newGame: 'Nová hra',
    solved: 'Vyřešeno!',
    solvedDesc: (diff: string, time: string) => `Skvělá práce, dokončili jste obtížnost ${diff} v čase ${time}.`,
    instructions: 'K hraní použijte klávesnici, šipky nebo číselník níže.',
    erase: 'Smazat',
    undo: 'Zpět',
    notes: 'Tužka',
    hint: 'Nápověda',
    mistakes: 'Chyby',
    time: 'Čas',
    paused: 'Pozastaveno',
    resume: 'Pokračovat',
    gameOver: 'Konec hry',
    outOfLives: 'Udělali jste 3 chyby.',
    bestTime: 'Nejlepší',
    restart: 'Restartovat',
    restartConfirm: 'Restartovat tuto hru?',
    yes: 'Ano',
    no: 'Ne',
  }
};

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export default function App() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [board, setBoard] = useState<Cell[]>([]);
  const [solution, setSolution] = useState<string>('');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isWon, setIsWon] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [timer, setTimer] = useState(0);
  const [hints, setHints] = useState(3);
  const [history, setHistory] = useState<Cell[][]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [pencilMode, setPencilMode] = useState(false);
  const [bestTimes, setBestTimes] = useState<Record<Difficulty, number | null>>({
    easy: null, medium: null, hard: null, expert: null
  });

  const [lang, setLang] = useState<Language>('cs');
  const [theme, setTheme] = useState<Theme>('light');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [shakeIdx, setShakeIdx] = useState<number | null>(null);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [hintedIdx, setHintedIdx] = useState<number | null>(null);
  const [flashIndices, setFlashIndices] = useState<number[]>([]);

  const t = translations[lang];

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const mouseXSpring = useSpring(mouseX, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(mouseY, { stiffness: 300, damping: 30 });
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7deg", "-7deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7deg", "7deg"]);
  
  const shadowX = useTransform(mouseXSpring, [-0.5, 0.5], [20, -20]);
  const shadowY = useTransform(mouseYSpring, [-0.5, 0.5], [20, -20]);
  const boxShadow = useMotionTemplate`${shadowX}px ${shadowY}px 40px rgba(0,0,0,0.2)`;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    mouseX.set(x / width - 0.5);
    mouseY.set(y / height - 0.5);
  }, [mouseX, mouseY]);

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  // Load saved state
  useEffect(() => {
    const saved = localStorage.getItem('sudoku-save');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setBoard(data.board);
        setSolution(data.solution);
        setDifficulty(data.difficulty);
        setMistakes(data.mistakes);
        setTimer(data.timer);
        setHints(data.hints);
        setHistory(data.history);
        setIsWon(data.isWon);
        setIsGameOver(data.isGameOver);
        if (data.bestTimes) setBestTimes(data.bestTimes);
      } catch (e) {}
    } else {
      // Delay initial generation slightly to avoid hydration mismatch
      setTimeout(() => startNewGame('easy'), 0);
    }
    
    const savedSettings = localStorage.getItem('sudoku-settings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setLang(settings.lang ?? 'cs');
        setTheme(settings.theme ?? 'light');
        setSoundEnabled(settings.soundEnabled ?? true);
      } catch(e) {}
    }
    
    setIsLoaded(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save state
  useEffect(() => {
    if (!isLoaded || board.length === 0) return;
    localStorage.setItem('sudoku-save', JSON.stringify({
      board, solution, difficulty, mistakes, timer, hints, history, isWon, isGameOver, bestTimes
    }));
  }, [board, solution, difficulty, mistakes, timer, hints, history, isWon, isGameOver, bestTimes, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem('sudoku-settings', JSON.stringify({
      lang, theme, soundEnabled
    }));
  }, [lang, theme, soundEnabled, isLoaded]);

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (!isPaused && !isWon && !isGameOver && board.length > 0) {
      interval = setInterval(() => {
        setTimer(time => time + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPaused, isWon, isGameOver, board.length]);

  const playSound = useCallback((type: 'click' | 'error' | 'win') => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'win') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.setValueAtTime(500, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(600, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {
      console.error("Audio play failed", e);
    }
  }, [soundEnabled]);

  const restartGame = useCallback(() => {
    setBoard(prev => prev.map(c => ({
      ...c,
      value: c.isGiven ? c.value : null,
      isError: false,
      notes: []
    })));
    setSelectedIdx(null);
    setIsWon(false);
    setIsGameOver(false);
    setMistakes(0);
    setTimer(0);
    setHints(3);
    setHistory([]);
    setIsPaused(false);
    setShowRestartConfirm(false);
  }, []);

  const startNewGame = useCallback((diff: Difficulty) => {
    const sudoku = getSudoku(diff);
    setSolution(sudoku.solution);
    const newBoard = sudoku.puzzle.split('').map((char) => ({
      value: char === '-' ? null : char,
      isGiven: char !== '-',
      isError: false,
      notes: []
    }));
    setBoard(newBoard);
    setSelectedIdx(null);
    setIsWon(false);
    setIsGameOver(false);
    setMistakes(0);
    setTimer(0);
    setHints(3);
    setHistory([]);
    setIsPaused(false);
    setDifficulty(diff);
  }, []);

  const checkCompletedRegions = useCallback((currentBoard: Cell[], idx: number) => {
    const row = Math.floor(idx / 9);
    const col = idx % 9;
    const blockRow = Math.floor(row / 3);
    const blockCol = Math.floor(col / 3);

    const rowIndices = Array.from({length: 9}, (_, i) => row * 9 + i);
    const colIndices = Array.from({length: 9}, (_, i) => i * 9 + col);
    const blockIndices: number[] = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        blockIndices.push((blockRow * 3 + r) * 9 + (blockCol * 3 + c));
      }
    }

    let toFlash: number[] = [];

    const isRegionComplete = (indices: number[]) => {
      return indices.every(i => currentBoard[i].value !== null && !currentBoard[i].isError && currentBoard[i].value === solution[i]);
    };

    if (isRegionComplete(rowIndices)) toFlash.push(...rowIndices);
    if (isRegionComplete(colIndices)) toFlash.push(...colIndices);
    if (isRegionComplete(blockIndices)) toFlash.push(...blockIndices);

    if (toFlash.length > 0) {
      setFlashIndices(prev => [...new Set([...prev, ...toFlash])]);
      setTimeout(() => {
        setFlashIndices(prev => prev.filter(i => !toFlash.includes(i)));
      }, 600);
    }
  }, [solution]);

  const checkWin = useCallback((currentBoard: Cell[]) => {
    const isComplete = currentBoard.every(c => c.value !== null);
    if (!isComplete) return;

    const isCorrect = currentBoard.every((c, i) => c.value === solution[i]);
    if (isCorrect) {
      setIsWon(true);
      playSound('win');
      
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };
      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);
        const particleCount = 50 * (timeLeft / duration);
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
      }, 250);
      
      setBestTimes(prev => {
        const currentBest = prev[difficulty];
        if (currentBest === null || timer < currentBest) {
          return { ...prev, [difficulty]: timer };
        }
        return prev;
      });
    }
  }, [solution, difficulty, timer, playSound]);

  const handleInput = useCallback((val: string | null) => {
    if (selectedIdx === null || isWon || isGameOver || isPaused) return;
    if (board[selectedIdx].isGiven) return;

    const newBoard = [...board];
    const currentCell = { ...newBoard[selectedIdx] };

    setHistory(prev => [...prev, board]);

    if (pencilMode && val !== null) {
      const num = parseInt(val);
      const notes = currentCell.notes || [];
      if (notes.includes(num)) {
        currentCell.notes = notes.filter(n => n !== num);
      } else {
        currentCell.notes = [...notes, num].sort();
      }
      currentCell.value = null;
      currentCell.isError = false;
      newBoard[selectedIdx] = currentCell;
    } else {
      const isError = val !== null && val !== solution[selectedIdx];
      currentCell.value = val;
      currentCell.notes = [];
      currentCell.isError = isError;
      newBoard[selectedIdx] = currentCell;

      if (isError) {
        setMistakes(m => {
          const newM = m + 1;
          if (newM >= 3) setIsGameOver(true);
          playSound('error');
          return newM;
        });
        setShakeIdx(selectedIdx);
        setTimeout(() => setShakeIdx(null), 400);
      } else if (val !== null) {
        playSound('click');
        // Auto-remove notes
        const row = Math.floor(selectedIdx / 9);
        const col = selectedIdx % 9;
        const blockRow = Math.floor(row / 3);
        const blockCol = Math.floor(col / 3);
        
        newBoard.forEach((cell, i) => {
          if (i === selectedIdx) return;
          const r = Math.floor(i / 9);
          const c = i % 9;
          if (r === row || c === col || (Math.floor(r / 3) === blockRow && Math.floor(c / 3) === blockCol)) {
            newBoard[i] = { ...cell, notes: (cell.notes || []).filter(n => n !== parseInt(val)) };
          }
        });
      }
    }
    
    setBoard(newBoard);

    if (val !== null && !currentCell.isError && !pencilMode) {
      checkCompletedRegions(newBoard, selectedIdx);
      checkWin(newBoard);
    }
  }, [board, selectedIdx, isWon, isGameOver, isPaused, pencilMode, solution, checkWin, playSound, checkCompletedRegions]);

  const useHint = useCallback(() => {
    if (hints <= 0 || isWon || isGameOver || isPaused) return;
    
    const emptyOrErrorIndices = board
      .map((c, i) => (!c.isGiven && (c.value === null || c.isError) ? i : -1))
      .filter(i => i !== -1);
      
    if (emptyOrErrorIndices.length === 0) return;
    
    const targetIdx = selectedIdx !== null && emptyOrErrorIndices.includes(selectedIdx) 
      ? selectedIdx 
      : emptyOrErrorIndices[Math.floor(Math.random() * emptyOrErrorIndices.length)];

    setHistory(prev => [...prev, board]);
    setHints(h => h - 1);
    
    const newBoard = [...board];
    const correctVal = solution[targetIdx];
    newBoard[targetIdx] = {
      ...newBoard[targetIdx],
      value: correctVal,
      isError: false,
      notes: []
    };
    
    const row = Math.floor(targetIdx / 9);
    const col = targetIdx % 9;
    const blockRow = Math.floor(row / 3);
    const blockCol = Math.floor(col / 3);
    
    newBoard.forEach((cell, i) => {
      if (i === targetIdx) return;
      const r = Math.floor(i / 9);
      const c = i % 9;
      if (r === row || c === col || (Math.floor(r / 3) === blockRow && Math.floor(c / 3) === blockCol)) {
        newBoard[i] = { ...cell, notes: (cell.notes || []).filter(n => n !== parseInt(correctVal)) };
      }
    });
    
    setBoard(newBoard);
    playSound('click');
    setHintedIdx(targetIdx);
    setTimeout(() => setHintedIdx(null), 1000);
    checkCompletedRegions(newBoard, targetIdx);
    checkWin(newBoard);
  }, [board, hints, isWon, isGameOver, isPaused, selectedIdx, solution, playSound, checkWin, checkCompletedRegions]);

  const handleUndo = useCallback(() => {
    if (history.length === 0 || isWon || isGameOver || isPaused) return;
    const previousBoard = history[history.length - 1];
    setBoard(previousBoard);
    setHistory(prev => prev.slice(0, -1));
  }, [history, isWon, isGameOver, isPaused]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isWon || isGameOver || isPaused) return;

      if (e.key >= '1' && e.key <= '9') {
        handleInput(e.key);
      } else if (e.key === 'Escape' && showRestartConfirm) {
        setShowRestartConfirm(false);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        handleInput(null);
      } else if (e.key.toLowerCase() === 'n') {
        setPencilMode(p => !p);
      } else if (e.key.toLowerCase() === 'h') {
        useHint();
      } else if (e.key.toLowerCase() === 'z' && (e.ctrlKey || e.metaKey)) {
        handleUndo();
      } else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        if (selectedIdx === null) {
          setSelectedIdx(0);
          return;
        }
        let newIdx = selectedIdx;
        if (e.key === 'ArrowUp') newIdx -= 9;
        if (e.key === 'ArrowDown') newIdx += 9;
        if (e.key === 'ArrowLeft') newIdx -= 1;
        if (e.key === 'ArrowRight') newIdx += 1;

        if (newIdx >= 0 && newIdx < 81) {
          setSelectedIdx(newIdx);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIdx, isWon, isGameOver, isPaused, handleInput, useHint, handleUndo, showRestartConfirm]);

  if (!isLoaded || board.length === 0) return null;

  const completedNumbers = board.reduce((acc, cell, i) => {
    if (cell.value && !cell.isError && cell.value === solution[i]) {
      acc[cell.value] = (acc[cell.value] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className={theme}>
      <div className={cn(
        "min-h-screen py-6 px-4 font-sans flex flex-col items-center transition-colors duration-200",
        "bg-slate-50 text-slate-900",
        "dark:bg-slate-900 dark:text-slate-100",
        "biker:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] biker:from-stone-900 biker:to-[#09090b] biker:text-stone-300"
      )}>
        
        {/* Header */}
        <div className="w-full max-w-[450px] mb-4 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 biker:text-orange-500 biker:font-black biker:uppercase biker:tracking-widest drop-shadow-sm transition-colors">{t.title}</h1>
          <div className="flex items-center gap-1 sm:gap-2">
            <button onPointerDown={(e) => { createRipple(e); setSoundEnabled(!soundEnabled); }} className="relative overflow-hidden p-2 text-slate-600 dark:text-slate-400 biker:text-stone-400 hover:bg-slate-200 dark:hover:bg-slate-800 biker:hover:bg-stone-800 rounded-md transition-colors" title="Toggle Sound">
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <button onPointerDown={(e) => { createRipple(e); setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'biker' : 'light'); }} className="relative overflow-hidden p-2 text-slate-600 dark:text-slate-400 biker:text-stone-400 hover:bg-slate-200 dark:hover:bg-slate-800 biker:hover:bg-stone-800 rounded-md transition-colors" title="Toggle Theme">
              {theme === 'light' && <Sun className="w-5 h-5" />}
              {theme === 'dark' && <Moon className="w-5 h-5" />}
              {theme === 'biker' && <Flame className="w-5 h-5 text-orange-500" />}
            </button>
            <button onPointerDown={(e) => { createRipple(e); setLang(lang === 'cs' ? 'en' : 'cs'); }} className="relative overflow-hidden flex items-center gap-1 px-2 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 biker:text-stone-400 hover:bg-slate-200 dark:hover:bg-slate-800 biker:hover:bg-stone-800 rounded-md transition-colors" title="Toggle Language">
              <Globe className="w-4 h-4" />
              {lang.toUpperCase()}
            </button>
          </div>
        </div>

        {/* Info Bar */}
        <div className="w-full max-w-[450px] mb-4 flex items-center justify-between text-sm font-medium text-slate-600 dark:text-slate-400 biker:text-stone-400">
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-200 dark:bg-slate-800 biker:bg-stone-900 biker:border biker:border-stone-800 rounded-md px-2 py-1 transition-colors">
              <select
                value={difficulty}
                onChange={(e) => startNewGame(e.target.value as Difficulty)}
                className="bg-transparent border-none text-slate-800 dark:text-slate-200 biker:text-orange-500 font-bold outline-none cursor-pointer p-0 mr-1 biker:uppercase biker:tracking-wider biker:text-xs transition-colors"
              >
                <option value="easy">{t.easy}</option>
                <option value="medium">{t.medium}</option>
                <option value="hard">{t.hard}</option>
                <option value="expert">{t.expert}</option>
              </select>
              <button onPointerDown={(e) => { createRipple(e); startNewGame(difficulty); }} className="relative overflow-hidden text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 biker:text-stone-500 biker:hover:text-orange-500 transition-colors p-1 rounded-full" title={t.newGame}>
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <span>{t.mistakes}: <span className={cn(mistakes > 0 ? "text-red-500 dark:text-red-400 biker:text-red-500" : "", mistakes === 2 && "inline-block animate-danger")}>{mistakes}/3</span></span>
            <span>{t.time}: {formatTime(timer)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onPointerDown={(e) => { createRipple(e); setShowRestartConfirm(true); }} disabled={isWon || isGameOver} className="relative overflow-hidden hover:text-slate-900 dark:hover:text-slate-100 biker:hover:text-orange-500 transition-colors disabled:opacity-50 p-1 rounded-full" title={t.restart}>
              <RotateCcw className="w-5 h-5" />
            </button>
            <button onPointerDown={(e) => { createRipple(e); setIsPaused(!isPaused); }} disabled={isWon || isGameOver} className="relative overflow-hidden hover:text-slate-900 dark:hover:text-slate-100 biker:hover:text-orange-500 transition-colors disabled:opacity-50 p-1 rounded-full">
              {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Best Time & Win Message */}
        <AnimatePresence>
        {isWon && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-[450px] mb-6 bg-green-100 dark:bg-green-900/40 biker:bg-green-950/40 border border-green-300 dark:border-green-800 biker:border-green-900 text-green-800 dark:text-green-300 biker:text-green-500 px-4 py-3 rounded-lg flex items-center gap-3 transition-colors"
          >
            <Trophy className="w-6 h-6 text-green-600 dark:text-green-400 biker:text-green-500 shrink-0" />
            <div>
              <p className="font-bold">{t.solved}</p>
              <p className="text-sm">{t.solvedDesc(t[difficulty].toLowerCase(), formatTime(timer))}</p>
            </div>
          </motion.div>
        )}
        </AnimatePresence>

        {/* Board */}
        <div style={{ perspective: 1000 }} className="w-full max-w-[450px]">
          <motion.div
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ rotateX, rotateY, boxShadow, transformStyle: "preserve-3d" }}
            className="relative grid grid-cols-9 border-2 border-slate-800 dark:border-slate-400 biker:border-orange-600 w-full bg-white dark:bg-slate-800 biker:bg-stone-950 rounded-sm biker:shadow-[0_0_30px_rgba(234,88,12,0.15)] transition-colors"
          >
            {board.map((cell, i) => {
            const row = Math.floor(i / 9);
            const col = i % 9;
            const isSelected = selectedIdx === i;
            const isRelated = selectedIdx !== null && (
              Math.floor(selectedIdx / 9) === row ||
              selectedIdx % 9 === col ||
              (Math.floor(Math.floor(selectedIdx / 9) / 3) === Math.floor(row / 3) && Math.floor((selectedIdx % 9) / 3) === Math.floor(col / 3))
            );
            const isSameValue = selectedIdx !== null && board[selectedIdx].value && board[selectedIdx].value === cell.value;

            return (
              <div
                key={i}
                onPointerDown={(e) => { createRipple(e); setSelectedIdx(i); }}
                className={cn(
                  "relative overflow-hidden flex items-center justify-center text-xl sm:text-2xl font-medium cursor-pointer select-none aspect-square transition-colors",
                  "border border-slate-200 dark:border-slate-700 biker:border-stone-800/80",
                  col % 3 === 2 && col !== 8 && "border-r-2 border-r-slate-800 dark:border-r-slate-400 biker:border-r-orange-600",
                  row % 3 === 2 && row !== 8 && "border-b-2 border-b-slate-800 dark:border-b-slate-400 biker:border-b-orange-600",
                  isSelected ? "bg-blue-200 dark:bg-blue-900/60 biker:bg-orange-950/80 z-10 dark:shadow-[inset_0_0_15px_rgba(59,130,246,0.5)] biker:shadow-[inset_0_0_15px_rgba(234,88,12,0.4)] dark:border-blue-400 biker:border-orange-500" : isSameValue ? "bg-blue-100 dark:bg-blue-900/40 biker:bg-stone-800" : isRelated ? "bg-blue-50 dark:bg-blue-900/20 biker:bg-stone-800/40" : "bg-white dark:bg-slate-800 biker:bg-[#121214]",
                  cell.isGiven ? "text-slate-900 dark:text-slate-100 biker:text-stone-200" : "text-blue-600 dark:text-blue-400 biker:text-orange-500",
                  cell.isError && "bg-red-100 dark:bg-red-900/50 biker:bg-red-950/50 text-red-600 dark:text-red-400 biker:text-red-500",
                  cell.isError && isSelected && "bg-red-200 dark:bg-red-900/70 biker:bg-red-900/60",
                  shakeIdx === i && "animate-shake",
                  flashIndices.includes(i) && "animate-flash",
                  hintedIdx === i && "animate-hint-pulse z-20"
                )}
              >
                <AnimatePresence>
                  {cell.value ? (
                    <motion.span
                      key={`${i}-${cell.value}`}
                      initial={cell.isGiven ? false : { scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0, filter: 'blur(4px)' }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      className="absolute"
                    >
                      {cell.value}
                    </motion.span>
                  ) : cell.notes && cell.notes.length > 0 ? (
                    <motion.div 
                      key={`notes-${i}`}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="grid grid-cols-3 grid-rows-3 w-full h-full p-0.5 absolute"
                    >
                      {[1,2,3,4,5,6,7,8,9].map(n => (
                        <div key={n} className="flex items-center justify-center text-[8px] sm:text-[10px] leading-none text-slate-500 dark:text-slate-400">
                          {cell.notes.includes(n) ? n : ''}
                        </div>
                      ))}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}

          {/* Overlays */}
          <AnimatePresence>
          {(isPaused || isGameOver || showRestartConfirm) && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 biker:bg-[#09090b]/90 backdrop-blur-sm flex flex-col items-center justify-center z-10 transition-colors"
            >
              {showRestartConfirm ? (
                <>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 biker:text-stone-200 mb-6">{t.restartConfirm}</h2>
                  <div className="flex gap-4">
                    <button onPointerDown={(e) => { createRipple(e); restartGame(); }} className="relative overflow-hidden px-6 py-2 bg-red-600 hover:bg-red-700 biker:bg-orange-600 biker:hover:bg-orange-700 text-white rounded-lg font-medium transition-colors shadow-md">
                      {t.yes}
                    </button>
                    <button onPointerDown={(e) => { createRipple(e); setShowRestartConfirm(false); }} className="relative overflow-hidden px-6 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 biker:bg-stone-800 biker:hover:bg-stone-700 text-slate-800 dark:text-slate-200 biker:text-stone-300 rounded-lg font-medium transition-colors shadow-md">
                      {t.no}
                    </button>
                  </div>
                </>
              ) : isGameOver ? (
                <>
                  <h2 className="text-3xl font-bold text-red-600 dark:text-red-400 biker:text-red-500 mb-2">{t.gameOver}</h2>
                  <p className="text-slate-700 dark:text-slate-300 biker:text-stone-400 mb-6">{t.outOfLives}</p>
                  <button onPointerDown={(e) => { createRipple(e); startNewGame(difficulty); }} className="relative overflow-hidden px-6 py-3 bg-blue-600 hover:bg-blue-700 biker:bg-orange-600 biker:hover:bg-orange-700 text-white rounded-lg font-medium transition-colors shadow-md">
                    {t.newGame}
                  </button>
                </>
              ) : (
                <>
                  <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 biker:text-stone-200 mb-6">{t.paused}</h2>
                  <button onPointerDown={(e) => { createRipple(e); setIsPaused(false); }} className="relative overflow-hidden px-6 py-3 bg-blue-600 hover:bg-blue-700 biker:bg-orange-600 biker:hover:bg-orange-700 text-white rounded-lg font-medium transition-colors shadow-md flex items-center gap-2">
                    <Play className="w-5 h-5" /> {t.resume}
                  </button>
                </>
              )}
            </motion.div>
          )}
          </AnimatePresence>
          </motion.div>
        </div>

        {/* Action Bar */}
        <div className="grid grid-cols-4 gap-2 mt-4 w-full max-w-[450px]">
          <button onPointerDown={(e) => { createRipple(e); handleUndo(); }} disabled={history.length === 0 || isWon || isGameOver || isPaused} className="relative overflow-hidden flex flex-col items-center justify-center py-2 bg-white dark:bg-slate-800 biker:bg-stone-900 border border-slate-300 dark:border-slate-700 biker:border-stone-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 biker:hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:pointer-events-none text-slate-700 dark:text-slate-300 biker:text-stone-400">
            <Undo2 className="w-5 h-5 mb-1" />
            <span className="text-[10px] sm:text-xs font-medium">{t.undo}</span>
          </button>
          <button onPointerDown={(e) => { createRipple(e); handleInput(null); }} disabled={isWon || isGameOver || isPaused} className="relative overflow-hidden flex flex-col items-center justify-center py-2 bg-white dark:bg-slate-800 biker:bg-stone-900 border border-slate-300 dark:border-slate-700 biker:border-stone-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 biker:hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:pointer-events-none text-slate-700 dark:text-slate-300 biker:text-stone-400">
            <Eraser className="w-5 h-5 mb-1" />
            <span className="text-[10px] sm:text-xs font-medium">{t.erase}</span>
          </button>
          <button onPointerDown={(e) => { createRipple(e); setPencilMode(!pencilMode); }} disabled={isWon || isGameOver || isPaused} className={cn("relative overflow-hidden flex flex-col items-center justify-center py-2 bg-white dark:bg-slate-800 biker:bg-stone-900 border border-slate-300 dark:border-slate-700 biker:border-stone-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 biker:hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:pointer-events-none text-slate-700 dark:text-slate-300 biker:text-stone-400", pencilMode && "bg-blue-100 dark:bg-blue-900/50 biker:bg-orange-950/50 border-blue-400 dark:border-blue-500 biker:border-orange-600 text-blue-700 dark:text-blue-300 biker:text-orange-500")}>
            <Pencil className="w-5 h-5 mb-1" />
            <span className="text-[10px] sm:text-xs font-medium">{t.notes} {pencilMode ? 'ON' : 'OFF'}</span>
          </button>
          <button onPointerDown={(e) => { createRipple(e); useHint(); }} disabled={hints <= 0 || isWon || isGameOver || isPaused} className="relative overflow-hidden flex flex-col items-center justify-center py-2 bg-white dark:bg-slate-800 biker:bg-stone-900 border border-slate-300 dark:border-slate-700 biker:border-stone-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 biker:hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:pointer-events-none text-slate-700 dark:text-slate-300 biker:text-stone-400">
            <div className="relative">
              <Lightbulb className="w-5 h-5 mb-1" />
              <span className="absolute -top-1.5 -right-2 bg-blue-500 biker:bg-orange-600 text-white text-[9px] font-bold px-1.5 rounded-full transition-colors">{hints}</span>
            </div>
            <span className="text-[10px] sm:text-xs font-medium">{t.hint}</span>
          </button>
        </div>

        {/* Numpad */}
        <div className="flex flex-wrap justify-center gap-2 mt-4 w-full max-w-[450px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
            const isComplete = completedNumbers[num.toString()] === 9;
            return (
              <button
                key={num}
                onPointerDown={(e) => { createRipple(e); handleInput(num.toString()); }}
                disabled={isWon || isGameOver || isPaused || (isComplete && !pencilMode)}
                className={cn(
                  "relative overflow-hidden w-[calc(20%-0.4rem)] aspect-square sm:aspect-auto sm:py-3 bg-white dark:bg-slate-800 biker:bg-stone-900 border text-xl font-medium rounded-lg transition-colors shadow-sm flex items-center justify-center",
                  isComplete && !pencilMode
                    ? "border-slate-200 dark:border-slate-700 biker:border-stone-800/50 bg-slate-100 dark:bg-slate-800/50 biker:bg-stone-900/50 text-slate-300 dark:text-slate-600 biker:text-stone-700 cursor-not-allowed"
                    : "border-slate-300 dark:border-slate-600 biker:border-stone-700 hover:bg-slate-100 dark:hover:bg-slate-700 biker:hover:bg-stone-800 biker:hover:border-orange-600/50 text-slate-900 dark:text-slate-100 biker:text-orange-500 active:scale-95",
                  (isWon || isGameOver || isPaused) && "opacity-50 pointer-events-none"
                )}
              >
                {num}
              </button>
            );
          })}
        </div>
        
        {/* Footer */}
        <div className="mt-8 text-center text-slate-500 dark:text-slate-400 biker:text-stone-500 text-sm max-w-[450px] space-y-2 transition-colors">
          {bestTimes[difficulty] !== null && (
            <p className="font-medium text-slate-600 dark:text-slate-300 biker:text-stone-400">
              {t.bestTime} ({t[difficulty]}): {formatTime(bestTimes[difficulty]!)}
            </p>
          )}
          <p>{t.instructions}</p>
        </div>
      </div>
    </div>
  );
}
