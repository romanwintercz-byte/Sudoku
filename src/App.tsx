import { useState, useEffect, useCallback } from 'react';
import { getSudoku } from 'sudoku-gen';
import confetti from 'canvas-confetti';
import { RefreshCw, Eraser, Trophy, Globe, Play, Pause, Moon, Sun, Volume2, VolumeX, Pencil, Lightbulb, Undo2, RotateCcw, Plus, Flame, Gamepad2, Landmark, Factory, Anchor, ChevronDown, User, Crown, Star, Heart, Zap, Sparkles, Smile, Settings, X } from 'lucide-react';
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
type Language = 'cs' | 'en' | 'de' | 'es' | 'fr' | 'zh' | 'ru';
type Theme = 'light' | 'dark' | 'biker' | 'retro' | 'historical' | 'industrial' | 'tattoo';
type AvatarType = 'user' | 'crown' | 'star' | 'heart' | 'zap' | 'sparkles' | 'smile';

type QuestType = 'win_any' | 'win_hard' | 'play_games' | 'no_mistakes';

interface DailyQuest {
  date: string;
  type: QuestType;
  target: number;
  progress: number;
  completed: boolean;
}

interface PlayerProfile {
  id: string;
  name: string;
  avatar: AvatarType;
  xp: number;
  level: number;
  hints: number;
  gamesPlayed: number;
  gamesWon: number;
  bestTimes: Record<Difficulty, number | null>;
  dailyQuest: DailyQuest | null;
}

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
    themes: { light: 'Light', dark: 'Dark', biker: 'Biker', retro: 'Retro', historical: 'Historical', industrial: 'Industrial', tattoo: 'Tattoo' },
    dailyQuest: 'Daily Quest',
    buyHint: 'Buy Hint (50 XP)',
    notEnoughXp: 'Not enough XP',
    completed: 'Completed',
    reward: 'Reward'
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
    themes: { light: 'Světlý', dark: 'Tmavý', biker: 'Motorkář', retro: 'Retro', historical: 'Historický', industrial: 'Industriální', tattoo: 'Tattoo' },
    dailyQuest: 'Denní úkol',
    buyHint: 'Koupit nápovědu (50 XP)',
    notEnoughXp: 'Málo XP',
    completed: 'Hotovo',
    reward: 'Odměna'
  },
  de: {
    title: 'Sudoku',
    easy: 'Leicht',
    medium: 'Mittel',
    hard: 'Schwer',
    expert: 'Experte',
    newGame: 'Neues Spiel',
    solved: 'Gelöst!',
    solvedDesc: (diff: string, time: string) => `Tolle Leistung! Schwierigkeit ${diff} in ${time} gelöst.`,
    instructions: 'Nutzen Sie Ihre Tastatur, Pfeiltasten oder das Zahlenfeld unten.',
    erase: 'Löschen',
    undo: 'Rückgängig',
    notes: 'Notizen',
    hint: 'Tipp',
    mistakes: 'Fehler',
    time: 'Zeit',
    paused: 'Pausiert',
    resume: 'Fortsetzen',
    gameOver: 'Spiel vorbei',
    outOfLives: 'Sie haben 3 Fehler gemacht.',
    bestTime: 'Beste',
    restart: 'Neustart',
    restartConfirm: 'Dieses Spiel neu starten?',
    yes: 'Ja',
    no: 'Nein',
    themes: { light: 'Hell', dark: 'Dunkel', biker: 'Biker', retro: 'Retro', historical: 'Historisch', industrial: 'Industriell', tattoo: 'Tattoo' },
    dailyQuest: 'Tagesquest',
    buyHint: 'Tipp kaufen (50 XP)',
    notEnoughXp: 'Zu wenig XP',
    completed: 'Abgeschlossen',
    reward: 'Belohnung'
  },
  es: {
    title: 'Sudoku',
    easy: 'Fácil',
    medium: 'Medio',
    hard: 'Difícil',
    expert: 'Experto',
    newGame: 'Nuevo juego',
    solved: '¡Resuelto!',
    solvedDesc: (diff: string, time: string) => `¡Gran trabajo! Dificultad ${diff} completada en ${time}.`,
    instructions: 'Usa tu teclado, las flechas o el teclado numérico de abajo.',
    erase: 'Borrar',
    undo: 'Deshacer',
    notes: 'Notas',
    hint: 'Pista',
    mistakes: 'Errores',
    time: 'Tiempo',
    paused: 'Pausado',
    resume: 'Reanudar',
    gameOver: 'Fin del juego',
    outOfLives: 'Has cometido 3 errores.',
    bestTime: 'Mejor',
    restart: 'Reiniciar',
    restartConfirm: '¿Reiniciar este juego?',
    yes: 'Sí',
    no: 'No',
    themes: { light: 'Claro', dark: 'Oscuro', biker: 'Motero', retro: 'Retro', historical: 'Histórico', industrial: 'Industrial', tattoo: 'Tatuaje' },
    dailyQuest: 'Misión diaria',
    buyHint: 'Comprar pista (50 XP)',
    notEnoughXp: 'Sin XP',
    completed: 'Completado',
    reward: 'Recompensa'
  },
  fr: {
    title: 'Sudoku',
    easy: 'Facile',
    medium: 'Moyen',
    hard: 'Difficile',
    expert: 'Expert',
    newGame: 'Nouv. jeu',
    solved: 'Résolu !',
    solvedDesc: (diff: string, time: string) => `Excellent travail ! Difficulté ${diff} en ${time}.`,
    instructions: 'Utilisez votre clavier, les flèches ou le pavé numérique.',
    erase: 'Effacer',
    undo: 'Annuler',
    notes: 'Notes',
    hint: 'Indice',
    mistakes: 'Erreurs',
    time: 'Temps',
    paused: 'En pause',
    resume: 'Reprendre',
    gameOver: 'Fin du jeu',
    outOfLives: 'Vous avez fait 3 erreurs.',
    bestTime: 'Meilleur',
    restart: 'Redémarrer',
    restartConfirm: 'Redémarrer ce jeu ?',
    yes: 'Oui',
    no: 'Non',
    themes: { light: 'Clair', dark: 'Sombre', biker: 'Motard', retro: 'Rétro', historical: 'Historique', industrial: 'Industriel', tattoo: 'Tatouage' },
    dailyQuest: 'Quête journalière',
    buyHint: 'Acheter indice (50 XP)',
    notEnoughXp: 'Pas assez d\'XP',
    completed: 'Terminé',
    reward: 'Récompense'
  },
  zh: {
    title: '数独',
    easy: '简单',
    medium: '中等',
    hard: '困难',
    expert: '专家',
    newGame: '新游戏',
    solved: '解开了！',
    solvedDesc: (diff: string, time: string) => `干得好！以 ${diff} 难度在 ${time} 内完成。`,
    instructions: '使用键盘、方向键或下方的数字键盘来玩。',
    erase: '擦除',
    undo: '撤销',
    notes: '笔记',
    hint: '提示',
    mistakes: '错误',
    time: '时间',
    paused: '已暂停',
    resume: '继续',
    gameOver: '游戏结束',
    outOfLives: '您犯了 3 次错误。',
    bestTime: '最佳',
    restart: '重新开始',
    restartConfirm: '重新开始这个数独？',
    yes: '是',
    no: '否',
    themes: { light: '亮色', dark: '暗色', biker: '骑手', retro: '复古', historical: '历史', industrial: '工业', tattoo: '纹身' },
    dailyQuest: '每日任务',
    buyHint: '购买提示 (50 XP)',
    notEnoughXp: 'XP 不足',
    completed: '已完成',
    reward: '奖励'
  },
  ru: {
    title: 'Судоку',
    easy: 'Легкий',
    medium: 'Средний',
    hard: 'Сложный',
    expert: 'Эксперт',
    newGame: 'Новая игра',
    solved: 'Решено!',
    solvedDesc: (diff: string, time: string) => `Отличная работа! Сложность ${diff} пройдена за ${time}.`,
    instructions: 'Используйте клавиатуру, стрелки или цифровую панель ниже.',
    erase: 'Стереть',
    undo: 'Отмена',
    notes: 'Заметки',
    hint: 'Подсказка',
    mistakes: 'Ошибки',
    time: 'Время',
    paused: 'Пауза',
    resume: 'Продолжить',
    gameOver: 'Игра окончена',
    outOfLives: 'Вы сделали 3 ошибки.',
    bestTime: 'Лучшее',
    restart: 'Рестарт',
    restartConfirm: 'Перезапустить эту игру?',
    yes: 'Да',
    no: 'Нет',
    themes: { light: 'Светлая', dark: 'Темная', biker: 'Байкер', retro: 'Ретро', historical: 'Историч.', industrial: 'Индустр.', tattoo: 'Тату' },
    dailyQuest: 'Ежедневное задание',
    buyHint: 'Купить подсказку (50 XP)',
    notEnoughXp: 'Мало XP',
    completed: 'Завершено',
    reward: 'Награда'
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
  const [history, setHistory] = useState<Cell[][]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [pencilMode, setPencilMode] = useState(false);

  const [lang, setLang] = useState<Language>('cs');
  const [theme, setTheme] = useState<Theme>('light');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [shakeIdx, setShakeIdx] = useState<number | null>(null);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [hintedIdx, setHintedIdx] = useState<number | null>(null);
  const [flashIndices, setFlashIndices] = useState<number[]>([]);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Partial<PlayerProfile> | null>(null);
  const [showDailyQuest, setShowDailyQuest] = useState(false);

  const [profiles, setProfiles] = useState<PlayerProfile[]>([
    {
      id: 'default',
      name: 'Player 1',
      avatar: 'user',
      xp: 0,
      level: 1,
      hints: 10,
      gamesPlayed: 0,
      gamesWon: 0,
      bestTimes: { easy: null, medium: null, hard: null, expert: null },
      dailyQuest: null
    }
  ]);
  const [currentProfileId, setCurrentProfileId] = useState<string>('default');

  const generateDailyQuest = useCallback((): DailyQuest => {
    const today = new Date().toISOString().split('T')[0];
    const types: QuestType[] = ['play_games', 'win_any', 'win_hard', 'no_mistakes'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    let target = 1;
    if (type === 'play_games') target = Math.floor(Math.random() * 3) + 2; // 2-4
    if (type === 'win_any') target = Math.floor(Math.random() * 2) + 1; // 1-2
    
    return {
      date: today,
      type,
      target,
      progress: 0,
      completed: false
    };
  }, []);

  const currentProfile = profiles.find(p => p.id === currentProfileId) || profiles[0];

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (currentProfile.dailyQuest?.date !== today) {
      setProfiles(prev => prev.map(p => p.id === currentProfileId ? { ...p, dailyQuest: generateDailyQuest() } : p));
    }
  }, [currentProfileId, currentProfile.dailyQuest?.date, generateDailyQuest]);

  const updateQuestProgress = useCallback((type: QuestType, amount: number = 1) => {
    setProfiles(prev => prev.map(p => {
      if (p.id !== currentProfileId || !p.dailyQuest || p.dailyQuest.completed) return p;
      if (p.dailyQuest.type !== type) return p;
      
      const newProgress = Math.min(p.dailyQuest.target, p.dailyQuest.progress + amount);
      const justCompleted = newProgress >= p.dailyQuest.target && !p.dailyQuest.completed;
      
      let newXp = p.xp;
      let newHints = p.hints;
      if (justCompleted) {
        newXp += 150;
        newHints += 5;
        setTimeout(() => {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        }, 300);
      }
      
      return {
        ...p,
        xp: newXp,
        hints: newHints,
        dailyQuest: {
          ...p.dailyQuest,
          progress: newProgress,
          completed: justCompleted ? true : p.dailyQuest.completed
        }
      };
    }));
  }, [currentProfileId]);

  const t = translations[lang];

  const AVATARS: { id: AvatarType; icon: React.ElementType }[] = [
    { id: 'user', icon: User },
    { id: 'crown', icon: Crown },
    { id: 'star', icon: Star },
    { id: 'heart', icon: Heart },
    { id: 'zap', icon: Zap },
    { id: 'sparkles', icon: Sparkles },
    { id: 'smile', icon: Smile },
  ];

  const LANGUAGES: { id: Language; label: string }[] = [
    { id: 'en', label: 'English' },
    { id: 'cs', label: 'Čeština' },
    { id: 'de', label: 'Deutsch' },
    { id: 'es', label: 'Español' },
    { id: 'fr', label: 'Français' },
    { id: 'zh', label: '中文' },
    { id: 'ru', label: 'Русский' },
  ];

  const THEMES: { id: Theme; icon: React.ElementType }[] = [
    { id: 'light', icon: Sun },
    { id: 'dark', icon: Moon },
    { id: 'biker', icon: Flame },
    { id: 'retro', icon: Gamepad2 },
    { id: 'historical', icon: Landmark },
    { id: 'industrial', icon: Factory },
    { id: 'tattoo', icon: Anchor },
  ];

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
        setHistory(data.history);
        setIsWon(data.isWon);
        setIsGameOver(data.isGameOver);
        if (data.profiles) setProfiles(data.profiles);
        if (data.currentProfileId) setCurrentProfileId(data.currentProfileId);
        // Migration from bestTimes to profiles if needed
        if (data.bestTimes && !data.profiles) {
          setProfiles(prev => {
            const newProfiles = [...prev];
            newProfiles[0].bestTimes = data.bestTimes;
            return newProfiles;
          });
        }
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
      board, solution, difficulty, mistakes, timer, history, isWon, isGameOver, profiles, currentProfileId
    }));
  }, [board, solution, difficulty, mistakes, timer, history, isWon, isGameOver, profiles, currentProfileId, isLoaded]);

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
    setHistory([]);
    setIsPaused(false);
    setDifficulty(diff);
    
    setProfiles(prev => prev.map(p => p.id === currentProfileId ? { ...p, gamesPlayed: p.gamesPlayed + 1 } : p));
    updateQuestProgress('play_games');
  }, [currentProfileId, updateQuestProgress]);

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
      
      setProfiles(prev => prev.map(p => {
        if (p.id !== currentProfileId) return p;
        const currentBest = p.bestTimes[difficulty];
        const newBest = (currentBest === null || timer < currentBest) ? timer : currentBest;
        
        let xpGained = 0;
        if (difficulty === 'easy') xpGained = 10;
        else if (difficulty === 'medium') xpGained = 20;
        else if (difficulty === 'hard') xpGained = 30;
        else if (difficulty === 'expert') xpGained = 40;
        
        const newXp = p.xp + xpGained;
        const newLevel = Math.floor(Math.sqrt(newXp / 10)) + 1;
        
        return {
          ...p,
          gamesWon: p.gamesWon + 1,
          xp: newXp,
          level: newLevel,
          bestTimes: { ...p.bestTimes, [difficulty]: newBest }
        };
      }));
      
      updateQuestProgress('win_any');
      if (difficulty === 'hard' || difficulty === 'expert') updateQuestProgress('win_hard');
      if (mistakes === 0) updateQuestProgress('no_mistakes');
    }
  }, [solution, difficulty, timer, playSound, currentProfileId, mistakes, updateQuestProgress]);

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
    if (currentProfile.hints <= 0 || isWon || isGameOver || isPaused) return;
    
    const emptyOrErrorIndices = board
      .map((c, i) => (!c.isGiven && (c.value === null || c.isError) ? i : -1))
      .filter(i => i !== -1);
      
    if (emptyOrErrorIndices.length === 0) return;
    
    const targetIdx = selectedIdx !== null && emptyOrErrorIndices.includes(selectedIdx) 
      ? selectedIdx 
      : emptyOrErrorIndices[Math.floor(Math.random() * emptyOrErrorIndices.length)];

    setHistory(prev => [...prev, board]);
    setProfiles(prev => prev.map(p => p.id === currentProfileId ? { ...p, hints: p.hints - 1 } : p));
    
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
  }, [board, currentProfile.hints, isWon, isGameOver, isPaused, selectedIdx, solution, playSound, checkWin, checkCompletedRegions, currentProfileId]);

  const buyHint = useCallback(() => {
    if (currentProfile.xp < 50) return;
    setProfiles(prev => prev.map(p => p.id === currentProfileId ? { ...p, xp: p.xp - 50, hints: p.hints + 1 } : p));
  }, [currentProfile.xp, currentProfileId]);

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
        "biker:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] biker:from-stone-900 biker:to-[#09090b] biker:text-stone-300",
        "retro:bg-fuchsia-950 retro:text-cyan-400",
        "historical:bg-amber-50 historical:text-stone-800",
        "industrial:bg-zinc-800 industrial:text-zinc-300",
        "tattoo:bg-neutral-950 tattoo:text-neutral-300"
      )}>
        
        {/* Header */}
        <div className="w-full max-w-[450px] mb-4 flex items-center justify-between relative z-50">
          <h1 className={cn(
            "text-3xl font-bold tracking-tight drop-shadow-sm transition-colors",
            "text-slate-800 dark:text-slate-100",
            "biker:text-orange-500 biker:font-black biker:uppercase biker:tracking-widest",
            "retro:text-fuchsia-400 retro:font-mono retro:uppercase retro:tracking-widest retro:drop-shadow-[0_0_8px_rgba(232,121,249,0.8)]",
            "historical:text-amber-900 historical:font-serif historical:italic",
            "industrial:text-yellow-500 industrial:font-black industrial:tracking-tighter industrial:uppercase",
            "tattoo:text-red-600 tattoo:font-serif tattoo:tracking-widest tattoo:uppercase"
          )}>{t.title}</h1>
          <div className="flex items-center gap-1 sm:gap-2">
            <button onPointerDown={(e) => { createRipple(e); setSoundEnabled(!soundEnabled); }} className={cn(
              "relative overflow-hidden p-2 rounded-md transition-colors",
              "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800",
              "biker:text-stone-400 biker:hover:bg-stone-800",
              "retro:text-cyan-500 retro:hover:bg-fuchsia-900/50",
              "historical:text-stone-600 historical:hover:bg-amber-200",
              "industrial:text-zinc-400 industrial:hover:bg-zinc-700",
              "tattoo:text-neutral-500 tattoo:hover:bg-neutral-800"
            )} title="Toggle Sound">
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            
            {/* Theme Dropdown */}
            <div className="relative">
              <button onPointerDown={(e) => { createRipple(e); setIsThemeMenuOpen(!isThemeMenuOpen); }} className={cn(
                "relative overflow-hidden flex items-center gap-1 p-2 rounded-md transition-colors",
                "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800",
                "biker:text-stone-400 biker:hover:bg-stone-800",
                "retro:text-cyan-500 retro:hover:bg-fuchsia-900/50",
                "historical:text-stone-600 historical:hover:bg-amber-200",
                "industrial:text-zinc-400 industrial:hover:bg-zinc-700",
                "tattoo:text-neutral-500 tattoo:hover:bg-neutral-800"
              )} title="Toggle Theme">
                {(() => {
                  const CurrentIcon = THEMES.find(th => th.id === theme)?.icon || Sun;
                  return <CurrentIcon className="w-5 h-5" />;
                })()}
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>
              
              <AnimatePresence>
                {isThemeMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsThemeMenuOpen(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className={cn(
                        "absolute top-full right-0 mt-2 w-48 shadow-xl rounded-lg border z-50 overflow-hidden",
                        "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700",
                        "biker:bg-stone-900 biker:border-stone-800",
                        "retro:bg-fuchsia-950 retro:border-fuchsia-800",
                        "historical:bg-amber-50 historical:border-amber-200",
                        "industrial:bg-zinc-900 industrial:border-zinc-700",
                        "tattoo:bg-[#111] tattoo:border-neutral-800"
                      )}
                    >
                      {THEMES.map(th => {
                        const Icon = th.icon;
                        const isSelected = theme === th.id;
                        return (
                          <button 
                            key={th.id}
                            onClick={() => { setTheme(th.id); setIsThemeMenuOpen(false); }}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors",
                              isSelected
                                ? cn(
                                  "font-medium",
                                  "bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400",
                                  "biker:bg-stone-800 biker:text-orange-500",
                                  "retro:bg-fuchsia-900 retro:text-cyan-400",
                                  "historical:bg-amber-200 historical:text-amber-900",
                                  "industrial:bg-zinc-800 industrial:text-yellow-500",
                                  "tattoo:bg-neutral-800 tattoo:text-red-500"
                                )
                                : cn(
                                  "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50",
                                  "biker:text-stone-400 biker:hover:bg-stone-800/50",
                                  "retro:text-fuchsia-300 retro:hover:bg-fuchsia-900/50",
                                  "historical:text-stone-700 historical:hover:bg-amber-100",
                                  "industrial:text-zinc-400 industrial:hover:bg-zinc-800/50",
                                  "tattoo:text-neutral-400 tattoo:hover:bg-[#1a1a1a]"
                                )
                            )}
                          >
                            <Icon className="w-5 h-5" />
                            {/* @ts-ignore */}
                            {t.themes[th.id]}
                          </button>
                        );
                      })}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Language Dropdown */}
            <div className="relative">
              <button onPointerDown={(e) => { createRipple(e); setIsLangMenuOpen(!isLangMenuOpen); }} className={cn(
                "relative overflow-hidden flex items-center gap-1 px-2 py-1.5 text-sm font-medium rounded-md transition-colors",
                "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800",
                "biker:text-stone-400 biker:hover:bg-stone-800",
                "retro:text-cyan-500 retro:hover:bg-fuchsia-900/50",
                "historical:text-stone-600 historical:hover:bg-amber-200",
                "industrial:text-zinc-400 industrial:hover:bg-zinc-700",
                "tattoo:text-neutral-500 tattoo:hover:bg-neutral-800"
              )} title="Toggle Language">
                <Globe className="w-4 h-4" />
                {lang.toUpperCase()}
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>
              
              <AnimatePresence>
                {isLangMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsLangMenuOpen(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className={cn(
                        "absolute top-full right-0 mt-2 w-32 shadow-xl rounded-lg border z-50 overflow-hidden",
                        "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700",
                        "biker:bg-stone-900 biker:border-stone-800",
                        "retro:bg-fuchsia-950 retro:border-fuchsia-800",
                        "historical:bg-amber-50 historical:border-amber-200",
                        "industrial:bg-zinc-900 industrial:border-zinc-700",
                        "tattoo:bg-[#111] tattoo:border-neutral-800"
                      )}
                    >
                      {LANGUAGES.map(l => {
                        const isSelected = lang === l.id;
                        return (
                          <button 
                            key={l.id}
                            onClick={() => { setLang(l.id); setIsLangMenuOpen(false); }}
                            className={cn(
                              "w-full flex items-center justify-between px-4 py-3 text-sm text-left transition-colors",
                              isSelected
                                ? cn(
                                  "font-medium",
                                  "bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400",
                                  "biker:bg-stone-800 biker:text-orange-500",
                                  "retro:bg-fuchsia-900 retro:text-cyan-400",
                                  "historical:bg-amber-200 historical:text-amber-900",
                                  "industrial:bg-zinc-800 industrial:text-yellow-500",
                                  "tattoo:bg-neutral-800 tattoo:text-red-500"
                                )
                                : cn(
                                  "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50",
                                  "biker:text-stone-400 biker:hover:bg-stone-800/50",
                                  "retro:text-fuchsia-300 retro:hover:bg-fuchsia-900/50",
                                  "historical:text-stone-700 historical:hover:bg-amber-100",
                                  "industrial:text-zinc-400 industrial:hover:bg-zinc-800/50",
                                  "tattoo:text-neutral-400 tattoo:hover:bg-[#1a1a1a]"
                                )
                            )}
                          >
                            <span>{l.label}</span>
                            <span className="opacity-50 text-xs font-mono">{l.id.toUpperCase()}</span>
                          </button>
                        );
                      })}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            {/* Profile Dropdown */}
            <div className="relative">
              <button onPointerDown={(e) => { createRipple(e); setIsProfileMenuOpen(!isProfileMenuOpen); }} className={cn(
                "relative overflow-hidden flex items-center gap-1.5 px-2 py-1.5 text-sm font-medium rounded-md transition-colors",
                "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800",
                "biker:text-stone-400 biker:hover:bg-stone-800",
                "retro:text-cyan-500 retro:hover:bg-fuchsia-900/50",
                "historical:text-stone-600 historical:hover:bg-amber-200",
                "industrial:text-zinc-400 industrial:hover:bg-zinc-700",
                "tattoo:text-neutral-500 tattoo:hover:bg-neutral-800"
              )} title="Toggle Profile">
                {(() => {
                  const Icon = AVATARS.find(a => a.id === currentProfile.avatar)?.icon || User;
                  return <Icon className="w-4 h-4" />;
                })()}
                <span className="hidden sm:inline truncate max-w-[80px]">{currentProfile.name}</span>
                <span className={cn(
                  "px-1.5 py-0.5 text-[10px] rounded-full border bg-opacity-20",
                  "border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-300",
                  "biker:border-orange-900 biker:text-orange-500",
                  "retro:border-cyan-800 retro:text-cyan-400",
                  "historical:border-amber-400 historical:text-amber-800",
                  "industrial:border-yellow-700 industrial:text-yellow-500",
                  "tattoo:border-red-900 tattoo:text-red-500"
                )}>Lvl {currentProfile.level}</span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>
              
              <AnimatePresence>
                {isProfileMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsProfileMenuOpen(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className={cn(
                        "absolute top-full right-0 mt-2 w-56 shadow-xl rounded-lg border z-50 overflow-hidden",
                        "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700",
                        "biker:bg-stone-900 biker:border-stone-800",
                        "retro:bg-fuchsia-950 retro:border-fuchsia-800",
                        "historical:bg-amber-50 historical:border-amber-200",
                        "industrial:bg-zinc-900 industrial:border-zinc-700",
                        "tattoo:bg-[#111] tattoo:border-neutral-800"
                      )}
                    >
                      <div className={cn(
                        "p-3 border-b text-xs flex items-center justify-between",
                        "border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400",
                        "biker:border-stone-800 biker:text-stone-500",
                        "retro:border-fuchsia-900 retro:text-fuchsia-600",
                        "historical:border-amber-200 historical:text-amber-800/60",
                        "industrial:border-zinc-800 industrial:text-zinc-500",
                        "tattoo:border-neutral-800 tattoo:text-neutral-600"
                      )}>
                        <span>PROFILES</span>
                        <button onClick={() => {
                          setEditingProfile({ id: `p-${Date.now()}`, name: `Player ${profiles.length + 1}`, avatar: 'user', xp: 0, level: 1, gamesPlayed: 0, gamesWon: 0, bestTimes: { easy: null, medium: null, hard: null, expert: null } });
                          setIsEditProfileOpen(true);
                          setIsProfileMenuOpen(false);
                        }} className="hover:text-blue-500 transition-colors" title="Add Profile"><Plus className="w-4 h-4" /></button>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {profiles.map(p => {
                          const isSelected = currentProfileId === p.id;
                          const Icon = AVATARS.find(a => a.id === p.avatar)?.icon || User;
                          return (
                            <div key={p.id} className="flex items-center group">
                              <button 
                                onClick={() => { setCurrentProfileId(p.id); setIsProfileMenuOpen(false); }}
                                className={cn(
                                  "flex-1 flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors",
                                  isSelected
                                    ? cn(
                                      "font-medium",
                                      "bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400",
                                      "biker:bg-stone-800 biker:text-orange-500",
                                      "retro:bg-fuchsia-900 retro:text-cyan-400",
                                      "historical:bg-amber-200 historical:text-amber-900",
                                      "industrial:bg-zinc-800 industrial:text-yellow-500",
                                      "tattoo:bg-neutral-800 tattoo:text-red-500"
                                    )
                                    : cn(
                                      "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50",
                                      "biker:text-stone-400 biker:hover:bg-stone-800/50",
                                      "retro:text-fuchsia-300 retro:hover:bg-fuchsia-900/50",
                                      "historical:text-stone-700 historical:hover:bg-amber-100",
                                      "industrial:text-zinc-400 industrial:hover:bg-zinc-800/50",
                                      "tattoo:text-neutral-400 tattoo:hover:bg-[#1a1a1a]"
                                    )
                                )}
                              >
                                <Icon className="w-4 h-4 opacity-70" />
                                <div className="flex-1 overflow-hidden">
                                  <div className="truncate">{p.name}</div>
                                  <div className="text-[10px] opacity-70 mt-0.5">Lvl {p.level} • {p.xp} XP</div>
                                </div>
                              </button>
                              <button 
                                onClick={() => { setEditingProfile(p); setIsEditProfileOpen(true); setIsProfileMenuOpen(false); }}
                                className={cn(
                                  "p-3 transition-colors",
                                  isSelected
                                    ? "bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 biker:bg-stone-800 biker:text-orange-500 retro:bg-fuchsia-900 retro:text-cyan-400 historical:bg-amber-200 historical:text-amber-900 industrial:bg-zinc-800 industrial:text-yellow-500 tattoo:bg-neutral-800 tattoo:text-red-500"
                                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 biker:hover:bg-stone-800/50 retro:hover:bg-fuchsia-900/50 historical:hover:bg-amber-100 industrial:hover:bg-zinc-800/50 tattoo:hover:bg-[#1a1a1a]"
                                )}
                              >
                                <Settings className="w-4 h-4 opacity-50 hover:opacity-100" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <div className={cn(
                        "p-3 border-t text-sm flex flex-col gap-2",
                        "border-slate-100 dark:border-slate-700",
                        "biker:border-stone-800 retro:border-fuchsia-900 historical:border-amber-200 industrial:border-zinc-800 tattoo:border-neutral-800"
                      )}>
                        {currentProfile.dailyQuest && (
                          <div className={cn(
                            "flex items-center justify-between p-2 rounded-lg border",
                            currentProfile.dailyQuest.completed 
                              ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800/50" 
                              : "bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700",
                            "biker:bg-stone-900 biker:border-stone-800",
                            "retro:bg-fuchsia-900/20 retro:border-fuchsia-800",
                            "historical:bg-amber-100/50 historical:border-amber-200",
                            "industrial:bg-zinc-900 industrial:border-zinc-800",
                            "tattoo:bg-[#111] tattoo:border-neutral-800"
                          )}>
                            <div className="flex-1">
                              <div className="text-[10px] font-bold tracking-wider opacity-60 mb-1">{t.dailyQuest.toUpperCase()}</div>
                              <div className={cn(
                                "text-xs font-medium",
                                currentProfile.dailyQuest.completed && "text-green-600 dark:text-green-400"
                              )}>
                                {currentProfile.dailyQuest.type === 'play_games' && `${currentProfile.dailyQuest.progress}/${currentProfile.dailyQuest.target} ${t.newGame}`}
                                {currentProfile.dailyQuest.type === 'win_any' && `${currentProfile.dailyQuest.progress}/${currentProfile.dailyQuest.target} ${t.solved}`}
                                {currentProfile.dailyQuest.type === 'win_hard' && `${currentProfile.dailyQuest.progress}/${currentProfile.dailyQuest.target} ${t.hard}`}
                                {currentProfile.dailyQuest.type === 'no_mistakes' && `${currentProfile.dailyQuest.progress}/${currentProfile.dailyQuest.target} (0 ${t.mistakes})`}
                              </div>
                            </div>
                            {currentProfile.dailyQuest.completed ? (
                              <div className="text-green-500"><Sparkles className="w-4 h-4" /></div>
                            ) : (
                              <div className="text-[10px] font-medium opacity-60 flex flex-col items-end">
                                <span>150 XP</span>
                                <span>+5 {t.hint}</span>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-1">
                          <button 
                            onClick={buyHint}
                            disabled={currentProfile.xp < 50}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                              "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60",
                              "biker:bg-orange-900/40 biker:text-orange-400 biker:hover:bg-orange-900/60",
                              "retro:bg-cyan-900/40 retro:text-cyan-400 retro:hover:bg-cyan-900/60",
                              "historical:bg-amber-200 historical:text-amber-800 historical:hover:bg-amber-300",
                              "industrial:bg-yellow-900/40 industrial:text-yellow-500 industrial:hover:bg-yellow-900/60",
                              "tattoo:bg-red-900/40 tattoo:text-red-400 tattoo:hover:bg-red-900/60"
                            )}
                          >
                            <Lightbulb className="w-3.5 h-3.5" />
                            <span className="text-xs">{t.buyHint}</span>
                          </button>
                          <span className={cn(
                            "text-xs font-medium opacity-70",
                            currentProfile.xp < 50 && "text-red-500"
                          )}>
                            {currentProfile.xp} XP
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Edit Profile Modal */}
        <AnimatePresence>
          {isEditProfileOpen && editingProfile && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsEditProfileOpen(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className={cn(
                  "relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col",
                  "bg-white dark:bg-slate-900",
                  "biker:bg-stone-900 biker:border biker:border-stone-800",
                  "retro:bg-fuchsia-950 retro:border retro:border-fuchsia-800 retro:shadow-[0_0_30px_rgba(232,121,249,0.3)]",
                  "historical:bg-amber-50 historical:border historical:border-amber-200",
                  "industrial:bg-zinc-900 industrial:border industrial:border-zinc-700",
                  "tattoo:bg-[#0a0a0a] tattoo:border tattoo:border-neutral-800"
                )}
              >
                <div className={cn(
                  "px-6 py-4 border-b flex items-center justify-between",
                  "border-slate-100 dark:border-slate-800",
                  "biker:border-stone-800 retro:border-fuchsia-900 historical:border-amber-200 industrial:border-zinc-800 tattoo:border-neutral-900"
                )}>
                  <h3 className={cn(
                    "text-lg font-bold",
                    "text-slate-800 dark:text-slate-200 biker:text-stone-200 retro:text-cyan-300 historical:text-stone-800 industrial:text-yellow-500 tattoo:text-red-500"
                  )}>Edit Profile</h3>
                  <button onClick={() => setIsEditProfileOpen(false)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-6 space-y-6">
                  <div>
                    <label className={cn(
                      "block text-sm font-medium mb-2",
                      "text-slate-700 dark:text-slate-300 biker:text-stone-400 retro:text-fuchsia-400 historical:text-stone-700 industrial:text-zinc-400 tattoo:text-neutral-500"
                    )}>Name</label>
                    <input 
                      type="text" 
                      value={editingProfile.name || ''} 
                      onChange={e => setEditingProfile({ ...editingProfile, name: e.target.value })}
                      className={cn(
                        "w-full px-4 py-2 rounded-lg border focus:ring-2 focus:outline-none transition-all",
                        "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:ring-blue-500 text-slate-900 dark:text-slate-100",
                        "biker:bg-stone-950 biker:border-stone-800 biker:focus:ring-orange-600 biker:text-stone-200",
                        "retro:bg-fuchsia-900/20 retro:border-fuchsia-700 retro:focus:ring-cyan-500 retro:text-cyan-100",
                        "historical:bg-amber-100/50 historical:border-amber-300 historical:focus:ring-amber-600 historical:text-stone-800",
                        "industrial:bg-zinc-950 industrial:border-zinc-700 industrial:focus:ring-yellow-600 industrial:text-zinc-200",
                        "tattoo:bg-[#111] tattoo:border-neutral-800 tattoo:focus:ring-red-600 tattoo:text-neutral-300"
                      )}
                      maxLength={15}
                    />
                  </div>
                  
                  <div>
                    <label className={cn(
                      "block text-sm font-medium mb-2",
                      "text-slate-700 dark:text-slate-300 biker:text-stone-400 retro:text-fuchsia-400 historical:text-stone-700 industrial:text-zinc-400 tattoo:text-neutral-500"
                    )}>Avatar</label>
                    <div className="grid grid-cols-4 gap-2">
                      {AVATARS.map(av => {
                        const Icon = av.icon;
                        const isSel = editingProfile.avatar === av.id;
                        return (
                          <button
                            key={av.id}
                            onClick={() => setEditingProfile({ ...editingProfile, avatar: av.id })}
                            className={cn(
                              "aspect-square rounded-lg flex items-center justify-center transition-all border-2",
                              isSel 
                                ? cn(
                                  "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
                                  "biker:border-orange-600 biker:bg-orange-900/20 biker:text-orange-500",
                                  "retro:border-cyan-500 retro:bg-cyan-900/20 retro:text-cyan-400",
                                  "historical:border-amber-600 historical:bg-amber-200/50 historical:text-amber-800",
                                  "industrial:border-yellow-500 industrial:bg-yellow-900/20 industrial:text-yellow-500",
                                  "tattoo:border-red-600 tattoo:bg-red-900/20 tattoo:text-red-500"
                                )
                                : cn(
                                  "border-transparent bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400",
                                  "biker:bg-stone-800 biker:hover:bg-stone-700 biker:text-stone-500",
                                  "retro:bg-fuchsia-900/30 retro:hover:bg-fuchsia-800/50 retro:text-fuchsia-500",
                                  "historical:bg-amber-100 historical:hover:bg-amber-200 historical:text-stone-500",
                                  "industrial:bg-zinc-800 industrial:hover:bg-zinc-700 industrial:text-zinc-500",
                                  "tattoo:bg-[#111] tattoo:hover:bg-[#1a1a1a] tattoo:text-neutral-600"
                                )
                            )}
                          >
                            <Icon className="w-6 h-6" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                
                <div className={cn(
                  "px-6 py-4 border-t flex justify-between gap-3",
                  "border-slate-100 dark:border-slate-800",
                  "biker:border-stone-800 retro:border-fuchsia-900 historical:border-amber-200 industrial:border-zinc-800 tattoo:border-neutral-900"
                )}>
                  {profiles.length > 1 && editingProfile.id && profiles.find(p => p.id === editingProfile.id) ? (
                    <button 
                      onClick={() => {
                        const newProfiles = profiles.filter(p => p.id !== editingProfile.id);
                        setProfiles(newProfiles);
                        if (currentProfileId === editingProfile.id) {
                          setCurrentProfileId(newProfiles[0].id);
                        }
                        setIsEditProfileOpen(false);
                      }}
                      className={cn(
                        "px-4 py-2 rounded-lg font-medium transition-colors border text-sm",
                        "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20",
                        "biker:border-red-900 biker:text-red-500 biker:hover:bg-red-900/20",
                        "retro:border-red-900 retro:text-red-400 retro:hover:bg-red-900/20",
                        "historical:border-red-300 historical:text-red-700 historical:hover:bg-red-100",
                        "industrial:border-red-900 industrial:text-red-500 industrial:hover:bg-red-900/20",
                        "tattoo:border-red-900 tattoo:text-red-600 tattoo:hover:bg-red-900/20"
                      )}
                    >
                      Delete
                    </button>
                  ) : <div></div>}
                  
                  <button 
                    onClick={() => {
                      if (!editingProfile.name?.trim()) return;
                      const isNew = !profiles.find(p => p.id === editingProfile.id);
                      if (isNew) {
                        setProfiles([...profiles, editingProfile as PlayerProfile]);
                        setCurrentProfileId(editingProfile.id!);
                      } else {
                        setProfiles(profiles.map(p => p.id === editingProfile.id ? { ...p, name: editingProfile.name!, avatar: editingProfile.avatar as AvatarType } : p));
                      }
                      setIsEditProfileOpen(false);
                    }}
                    className={cn(
                      "px-6 py-2 rounded-lg font-medium transition-colors text-white shadow-md text-sm",
                      "bg-blue-600 hover:bg-blue-700",
                      "biker:bg-orange-600 biker:hover:bg-orange-700",
                      "retro:bg-cyan-600 retro:hover:bg-cyan-700",
                      "historical:bg-stone-600 historical:hover:bg-stone-700",
                      "industrial:bg-yellow-600 industrial:hover:bg-yellow-700",
                      "tattoo:bg-red-700 tattoo:hover:bg-red-800"
                    )}
                  >
                    Save
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        <div className={cn(
          "w-full max-w-[450px] mb-4 flex items-center justify-between text-sm font-medium transition-colors",
          "text-slate-600 dark:text-slate-400",
          "biker:text-stone-400",
          "retro:text-cyan-400",
          "historical:text-stone-600",
          "industrial:text-zinc-400",
          "tattoo:text-neutral-500"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center rounded-md px-2 py-1 transition-colors",
              "bg-slate-200 dark:bg-slate-800",
              "biker:bg-stone-900 biker:border biker:border-stone-800",
              "retro:bg-fuchsia-900/40 retro:border retro:border-fuchsia-800",
              "historical:bg-amber-100 historical:border historical:border-amber-200",
              "industrial:bg-zinc-900 industrial:border industrial:border-zinc-700",
              "tattoo:bg-[#111] tattoo:border tattoo:border-neutral-800"
            )}>
              <select
                value={difficulty}
                onChange={(e) => startNewGame(e.target.value as Difficulty)}
                className={cn(
                  "bg-transparent border-none font-bold outline-none cursor-pointer p-0 mr-1 transition-colors",
                  "text-slate-800 dark:text-slate-200",
                  "biker:text-orange-500 biker:uppercase biker:tracking-wider biker:text-xs",
                  "retro:text-cyan-300 retro:uppercase",
                  "historical:text-stone-800",
                  "industrial:text-yellow-500",
                  "tattoo:text-red-500"
                )}
              >
                <option value="easy">{t.easy}</option>
                <option value="medium">{t.medium}</option>
                <option value="hard">{t.hard}</option>
                <option value="expert">{t.expert}</option>
              </select>
              <button onPointerDown={(e) => { createRipple(e); startNewGame(difficulty); }} className={cn(
                "relative overflow-hidden p-1 rounded-full transition-colors",
                "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100",
                "biker:text-stone-500 biker:hover:text-orange-500",
                "retro:text-fuchsia-500 retro:hover:text-cyan-300",
                "historical:text-stone-500 historical:hover:text-stone-800",
                "industrial:text-zinc-500 industrial:hover:text-yellow-500",
                "tattoo:text-neutral-600 tattoo:hover:text-red-500"
              )} title={t.newGame}>
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <span>{t.mistakes}: <span className={cn(
              mistakes > 0 && "text-red-500 dark:text-red-400 biker:text-red-500 retro:text-red-400 historical:text-red-600 industrial:text-red-500 tattoo:text-red-500", 
              mistakes === 2 && "inline-block animate-danger"
            )}>{mistakes}/3</span></span>
            <span>{t.time}: {formatTime(timer)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onPointerDown={(e) => { createRipple(e); setShowRestartConfirm(true); }} disabled={isWon || isGameOver} className={cn(
              "relative overflow-hidden p-1 rounded-full transition-colors disabled:opacity-50",
              "hover:text-slate-900 dark:hover:text-slate-100",
              "biker:hover:text-orange-500",
              "retro:hover:text-cyan-300",
              "historical:hover:text-stone-800",
              "industrial:hover:text-yellow-500",
              "tattoo:hover:text-red-500"
            )} title={t.restart}>
              <RotateCcw className="w-5 h-5" />
            </button>
            <button onPointerDown={(e) => { createRipple(e); setIsPaused(!isPaused); }} disabled={isWon || isGameOver} className={cn(
              "relative overflow-hidden p-1 rounded-full transition-colors disabled:opacity-50",
              "hover:text-slate-900 dark:hover:text-slate-100",
              "biker:hover:text-orange-500",
              "retro:hover:text-cyan-300",
              "historical:hover:text-stone-800",
              "industrial:hover:text-yellow-500",
              "tattoo:hover:text-red-500"
            )}>
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
            className={cn(
              "w-full max-w-[450px] mb-6 px-4 py-3 rounded-lg flex items-center gap-3 transition-colors",
              "bg-green-100 dark:bg-green-900/40 border border-green-300 dark:border-green-800 text-green-800 dark:text-green-300",
              "biker:bg-green-950/40 biker:border-green-900 biker:text-green-500",
              "retro:bg-emerald-950/50 retro:border-emerald-500 retro:text-emerald-400",
              "historical:bg-green-100/50 historical:border-green-300 historical:text-green-800",
              "industrial:bg-emerald-900/30 industrial:border-emerald-700 industrial:text-emerald-500",
              "tattoo:bg-green-950/40 tattoo:border-green-900 tattoo:text-green-600"
            )}
          >
            <Trophy className={cn(
              "w-6 h-6 shrink-0",
              "text-green-600 dark:text-green-400 biker:text-green-500 retro:text-emerald-400 historical:text-green-700 industrial:text-emerald-500 tattoo:text-green-600"
            )} />
            <div>
              <p className="font-bold">{t.solved}</p>
              <p className="text-sm">{t.solvedDesc(t[difficulty].toLowerCase(), formatTime(timer))}</p>
            </div>
          </motion.div>
        )}
        </AnimatePresence>

        {/* Board */}
        <div style={{ perspective: 1000 }} className="w-full max-w-[450px] z-10">
          <motion.div
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ rotateX, rotateY, boxShadow, transformStyle: "preserve-3d" }}
            className={cn(
              "relative grid grid-cols-9 border-2 w-full transition-colors",
              "bg-white dark:bg-slate-800 border-slate-800 dark:border-slate-400 rounded-sm",
              "biker:bg-stone-950 biker:border-orange-600 biker:shadow-[0_0_30px_rgba(234,88,12,0.15)]",
              "retro:bg-fuchsia-950 retro:border-cyan-500 retro:shadow-[0_0_30px_rgba(6,182,212,0.3)]",
              "historical:bg-amber-100 historical:border-stone-600 historical:shadow-[0_0_20px_rgba(120,113,108,0.2)] historical:rounded-md",
              "industrial:bg-zinc-900 industrial:border-yellow-600 industrial:shadow-[inset_0_0_15px_rgba(0,0,0,0.8),_0_0_20px_rgba(202,138,4,0.1)]",
              "tattoo:bg-[#0a0a0a] tattoo:border-red-800 tattoo:shadow-[0_0_40px_rgba(220,38,38,0.15)] tattoo:rounded-xl overflow-hidden"
            )}
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
                  "relative overflow-hidden flex items-center justify-center text-xl sm:text-2xl font-medium cursor-pointer select-none aspect-square transition-colors border",
                  "border-slate-200 dark:border-slate-700 biker:border-stone-800/80 retro:border-fuchsia-900/50 historical:border-amber-200 industrial:border-zinc-700 tattoo:border-neutral-800",
                  col % 3 === 2 && col !== 8 && "border-r-2 border-r-slate-800 dark:border-r-slate-400 biker:border-r-orange-600 retro:border-r-cyan-500 historical:border-r-stone-600 industrial:border-r-yellow-600 tattoo:border-r-red-800",
                  row % 3 === 2 && row !== 8 && "border-b-2 border-b-slate-800 dark:border-b-slate-400 biker:border-b-orange-600 retro:border-b-cyan-500 historical:border-b-stone-600 industrial:border-b-yellow-600 tattoo:border-b-red-800",
                  isSelected 
                    ? "z-10 bg-blue-200 dark:bg-blue-900/60 biker:bg-orange-950/80 retro:bg-cyan-900/40 historical:bg-amber-300 industrial:bg-yellow-900/30 tattoo:bg-red-950/40 dark:shadow-[inset_0_0_15px_rgba(59,130,246,0.5)] biker:shadow-[inset_0_0_15px_rgba(234,88,12,0.4)] retro:shadow-[inset_0_0_15px_rgba(6,182,212,0.6)] historical:shadow-[inset_0_0_10px_rgba(120,113,108,0.3)] industrial:shadow-[inset_0_0_15px_rgba(202,138,4,0.4)] tattoo:shadow-[inset_0_0_20px_rgba(220,38,38,0.3)] dark:border-blue-400 biker:border-orange-500 retro:border-cyan-400 historical:border-stone-500 industrial:border-yellow-500 tattoo:border-red-600" 
                    : isSameValue 
                      ? "bg-blue-100 dark:bg-blue-900/40 biker:bg-stone-800 retro:bg-fuchsia-800/40 historical:bg-amber-200 industrial:bg-zinc-700/50 tattoo:bg-[#222]" 
                      : isRelated 
                        ? "bg-blue-50 dark:bg-blue-900/20 biker:bg-stone-800/40 retro:bg-fuchsia-900/30 historical:bg-amber-100/50 industrial:bg-zinc-800/50 tattoo:bg-[#1a1a1a]" 
                        : "bg-white dark:bg-slate-800 biker:bg-[#121214] retro:bg-fuchsia-950 historical:bg-amber-50 industrial:bg-zinc-900 tattoo:bg-[#0a0a0a]",
                  cell.isGiven 
                    ? "text-slate-900 dark:text-slate-100 biker:text-stone-200 retro:text-fuchsia-200 historical:text-stone-800 industrial:text-zinc-200 tattoo:text-neutral-100" 
                    : "text-blue-600 dark:text-blue-400 biker:text-orange-500 retro:text-cyan-400 historical:text-amber-700 industrial:text-yellow-500 tattoo:text-red-500",
                  cell.isError && "bg-red-100 dark:bg-red-900/50 biker:bg-red-950/50 retro:bg-red-950/60 historical:bg-red-200/50 industrial:bg-red-900/30 tattoo:bg-red-950/40 text-red-600 dark:text-red-400 biker:text-red-500 retro:text-red-400 historical:text-red-800 industrial:text-red-500 tattoo:text-red-600",
                  cell.isError && isSelected && "bg-red-200 dark:bg-red-900/70 biker:bg-red-900/60 retro:bg-red-900/70 historical:bg-red-300/50 industrial:bg-red-800/40 tattoo:bg-red-900/50",
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
                        <div key={n} className={cn(
                          "flex items-center justify-center text-[8px] sm:text-[10px] leading-none",
                          "text-slate-500 dark:text-slate-400 biker:text-stone-500 retro:text-fuchsia-400 historical:text-stone-500 industrial:text-zinc-500 tattoo:text-neutral-500"
                        )}>
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
              className={cn(
                "absolute inset-0 backdrop-blur-sm flex flex-col items-center justify-center z-10 transition-colors",
                "bg-white/80 dark:bg-slate-900/80 biker:bg-[#09090b]/90 retro:bg-fuchsia-950/90 historical:bg-[#fdfaeb]/90 industrial:bg-zinc-900/90 tattoo:bg-[#0a0a0a]/90"
              )}
            >
              {showRestartConfirm ? (
                <>
                  <h2 className={cn(
                    "text-2xl font-bold mb-6",
                    "text-slate-800 dark:text-slate-200 biker:text-stone-200 retro:text-cyan-300 historical:text-stone-800 industrial:text-yellow-500 tattoo:text-red-500"
                  )}>{t.restartConfirm}</h2>
                  <div className="flex gap-4">
                    <button onPointerDown={(e) => { createRipple(e); restartGame(); }} className={cn(
                      "relative overflow-hidden px-6 py-2 rounded-lg font-medium transition-colors shadow-md text-white",
                      "bg-red-600 hover:bg-red-700 biker:bg-orange-600 biker:hover:bg-orange-700 retro:bg-cyan-600 retro:hover:bg-cyan-700 historical:bg-stone-600 historical:hover:bg-stone-700 industrial:bg-yellow-600 industrial:hover:bg-yellow-700 tattoo:bg-red-700 tattoo:hover:bg-red-800"
                    )}>
                      {t.yes}
                    </button>
                    <button onPointerDown={(e) => { createRipple(e); setShowRestartConfirm(false); }} className={cn(
                      "relative overflow-hidden px-6 py-2 rounded-lg font-medium transition-colors shadow-md",
                      "bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200",
                      "biker:bg-stone-800 biker:hover:bg-stone-700 biker:text-stone-300",
                      "retro:bg-fuchsia-900 retro:hover:bg-fuchsia-800 retro:text-fuchsia-200",
                      "historical:bg-amber-100 historical:hover:bg-amber-200 historical:text-stone-700",
                      "industrial:bg-zinc-800 industrial:hover:bg-zinc-700 industrial:text-zinc-300",
                      "tattoo:bg-[#111] tattoo:hover:bg-[#1a1a1a] tattoo:text-neutral-400"
                    )}>
                      {t.no}
                    </button>
                  </div>
                </>
              ) : isGameOver ? (
                <>
                  <h2 className={cn(
                    "text-3xl font-bold mb-2",
                    "text-red-600 dark:text-red-400 biker:text-red-500 retro:text-red-400 historical:text-red-700 industrial:text-red-500 tattoo:text-red-600"
                  )}>{t.gameOver}</h2>
                  <p className={cn(
                    "mb-6",
                    "text-slate-700 dark:text-slate-300 biker:text-stone-400 retro:text-fuchsia-300 historical:text-stone-600 industrial:text-zinc-400 tattoo:text-neutral-500"
                  )}>{t.outOfLives}</p>
                  <button onPointerDown={(e) => { createRipple(e); startNewGame(difficulty); }} className={cn(
                    "relative overflow-hidden px-6 py-3 rounded-lg font-medium transition-colors shadow-md text-white",
                    "bg-blue-600 hover:bg-blue-700 biker:bg-orange-600 biker:hover:bg-orange-700 retro:bg-cyan-600 retro:hover:bg-cyan-700 historical:bg-stone-600 historical:hover:bg-stone-700 industrial:bg-yellow-600 industrial:hover:bg-yellow-700 tattoo:bg-red-700 tattoo:hover:bg-red-800"
                  )}>
                    {t.newGame}
                  </button>
                </>
              ) : (
                <>
                  <h2 className={cn(
                    "text-3xl font-bold mb-6",
                    "text-slate-800 dark:text-slate-200 biker:text-stone-200 retro:text-cyan-300 historical:text-stone-800 industrial:text-yellow-500 tattoo:text-red-500"
                  )}>{t.paused}</h2>
                  <button onPointerDown={(e) => { createRipple(e); setIsPaused(false); }} className={cn(
                    "relative overflow-hidden px-6 py-3 rounded-lg font-medium transition-colors shadow-md flex items-center gap-2 text-white",
                    "bg-blue-600 hover:bg-blue-700 biker:bg-orange-600 biker:hover:bg-orange-700 retro:bg-cyan-600 retro:hover:bg-cyan-700 historical:bg-stone-600 historical:hover:bg-stone-700 industrial:bg-yellow-600 industrial:hover:bg-yellow-700 tattoo:bg-red-700 tattoo:hover:bg-red-800"
                  )}>
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
          <button onPointerDown={(e) => { createRipple(e); handleUndo(); }} disabled={history.length === 0 || isWon || isGameOver || isPaused} className={cn(
            "relative overflow-hidden flex flex-col items-center justify-center py-2 border rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none",
            "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300",
            "biker:bg-stone-900 biker:border-stone-800 biker:hover:bg-stone-800 biker:text-stone-400",
            "retro:bg-fuchsia-900/20 retro:border-fuchsia-800 retro:hover:bg-fuchsia-900/40 retro:text-cyan-500",
            "historical:bg-amber-50 historical:border-amber-200 historical:hover:bg-amber-100 historical:text-stone-600",
            "industrial:bg-zinc-800 industrial:border-zinc-700 industrial:hover:bg-zinc-700 industrial:text-zinc-400",
            "tattoo:bg-[#111] tattoo:border-neutral-800 tattoo:hover:bg-[#1a1a1a] tattoo:text-neutral-500"
          )}>
            <Undo2 className="w-5 h-5 mb-1" />
            <span className="text-[10px] sm:text-xs font-medium">{t.undo}</span>
          </button>
          <button onPointerDown={(e) => { createRipple(e); handleInput(null); }} disabled={isWon || isGameOver || isPaused} className={cn(
            "relative overflow-hidden flex flex-col items-center justify-center py-2 border rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none",
            "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300",
            "biker:bg-stone-900 biker:border-stone-800 biker:hover:bg-stone-800 biker:text-stone-400",
            "retro:bg-fuchsia-900/20 retro:border-fuchsia-800 retro:hover:bg-fuchsia-900/40 retro:text-cyan-500",
            "historical:bg-amber-50 historical:border-amber-200 historical:hover:bg-amber-100 historical:text-stone-600",
            "industrial:bg-zinc-800 industrial:border-zinc-700 industrial:hover:bg-zinc-700 industrial:text-zinc-400",
            "tattoo:bg-[#111] tattoo:border-neutral-800 tattoo:hover:bg-[#1a1a1a] tattoo:text-neutral-500"
          )}>
            <Eraser className="w-5 h-5 mb-1" />
            <span className="text-[10px] sm:text-xs font-medium">{t.erase}</span>
          </button>
          <button onPointerDown={(e) => { createRipple(e); setPencilMode(!pencilMode); }} disabled={isWon || isGameOver || isPaused} className={cn(
            "relative overflow-hidden flex flex-col items-center justify-center py-2 border rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none",
            pencilMode ? cn(
              "bg-blue-100 dark:bg-blue-900/50 border-blue-400 dark:border-blue-500 text-blue-700 dark:text-blue-300",
              "biker:bg-orange-950/50 biker:border-orange-600 biker:text-orange-500",
              "retro:bg-cyan-900/30 retro:border-cyan-500 retro:text-cyan-300",
              "historical:bg-amber-200 historical:border-stone-400 historical:text-stone-800",
              "industrial:bg-yellow-900/20 industrial:border-yellow-600 industrial:text-yellow-500",
              "tattoo:bg-red-950/30 tattoo:border-red-800 tattoo:text-red-500"
            ) : cn(
              "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300",
              "biker:bg-stone-900 biker:border-stone-800 biker:hover:bg-stone-800 biker:text-stone-400",
              "retro:bg-fuchsia-900/20 retro:border-fuchsia-800 retro:hover:bg-fuchsia-900/40 retro:text-cyan-500",
              "historical:bg-amber-50 historical:border-amber-200 historical:hover:bg-amber-100 historical:text-stone-600",
              "industrial:bg-zinc-800 industrial:border-zinc-700 industrial:hover:bg-zinc-700 industrial:text-zinc-400",
              "tattoo:bg-[#111] tattoo:border-neutral-800 tattoo:hover:bg-[#1a1a1a] tattoo:text-neutral-500"
            )
          )}>
            <Pencil className="w-5 h-5 mb-1" />
            <span className="text-[10px] sm:text-xs font-medium">{t.notes} {pencilMode ? 'ON' : 'OFF'}</span>
          </button>
          <button onPointerDown={(e) => { createRipple(e); useHint(); }} disabled={currentProfile.hints <= 0 || isWon || isGameOver || isPaused} className={cn(
            "relative overflow-hidden flex flex-col items-center justify-center py-2 border rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none",
            "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300",
            "biker:bg-stone-900 biker:border-stone-800 biker:hover:bg-stone-800 biker:text-stone-400",
            "retro:bg-fuchsia-900/20 retro:border-fuchsia-800 retro:hover:bg-fuchsia-900/40 retro:text-cyan-500",
            "historical:bg-amber-50 historical:border-amber-200 historical:hover:bg-amber-100 historical:text-stone-600",
            "industrial:bg-zinc-800 industrial:border-zinc-700 industrial:hover:bg-zinc-700 industrial:text-zinc-400",
            "tattoo:bg-[#111] tattoo:border-neutral-800 tattoo:hover:bg-[#1a1a1a] tattoo:text-neutral-500"
          )}>
            <div className="relative">
              <Lightbulb className="w-5 h-5 mb-1" />
              <span className={cn(
                "absolute -top-1.5 -right-2 text-white text-[9px] font-bold px-1.5 rounded-full transition-colors",
                "bg-blue-500 biker:bg-orange-600 retro:bg-cyan-500 historical:bg-stone-600 industrial:bg-yellow-600 tattoo:bg-red-700"
              )}>{currentProfile.hints}</span>
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
                  "relative overflow-hidden w-[calc(20%-0.4rem)] aspect-square sm:aspect-auto sm:py-3 border text-xl font-medium rounded-lg transition-colors shadow-sm flex items-center justify-center",
                  isComplete && !pencilMode
                    ? cn(
                      "cursor-not-allowed",
                      "bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600",
                      "biker:bg-stone-900/50 biker:border-stone-800/50 biker:text-stone-700",
                      "retro:bg-fuchsia-950/50 retro:border-fuchsia-900/50 retro:text-fuchsia-800",
                      "historical:bg-amber-50/50 historical:border-amber-200/50 historical:text-amber-200/50",
                      "industrial:bg-zinc-900/50 industrial:border-zinc-800/50 industrial:text-zinc-600",
                      "tattoo:bg-[#0a0a0a]/50 tattoo:border-neutral-900/50 tattoo:text-neutral-700"
                    )
                    : cn(
                      "active:scale-95",
                      "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100",
                      "biker:bg-stone-900 biker:border-stone-700 biker:hover:bg-stone-800 biker:text-stone-300 biker:hover:border-orange-600/50 biker:hover:text-orange-500",
                      "retro:bg-fuchsia-900/30 retro:border-fuchsia-700 retro:hover:bg-fuchsia-800/50 retro:text-cyan-100",
                      "historical:bg-amber-50 historical:border-amber-200 historical:hover:bg-amber-100 historical:text-stone-700",
                      "industrial:bg-zinc-800 industrial:border-zinc-600 industrial:hover:bg-zinc-700 industrial:text-zinc-200",
                      "tattoo:bg-[#111] tattoo:border-neutral-800 tattoo:hover:bg-[#1a1a1a] tattoo:text-neutral-300"
                    ),
                  (isWon || isGameOver || isPaused) && "opacity-50 pointer-events-none"
                )}
              >
                {num}
              </button>
            );
          })}
        </div>
        
        {/* Footer */}
        <div className={cn(
          "mt-8 text-center text-sm max-w-[450px] space-y-2 transition-colors",
          "text-slate-500 dark:text-slate-400",
          "biker:text-stone-500",
          "retro:text-fuchsia-500",
          "historical:text-stone-500",
          "industrial:text-zinc-500",
          "tattoo:text-neutral-600"
        )}>
          {currentProfile.bestTimes[difficulty] !== null && (
            <p className={cn(
              "font-medium",
              "text-slate-600 dark:text-slate-300",
              "biker:text-stone-400",
              "retro:text-cyan-500",
              "historical:text-stone-700",
              "industrial:text-zinc-400",
              "tattoo:text-neutral-400"
            )}>
              {t.bestTime} ({t[difficulty]}): {formatTime(currentProfile.bestTimes[difficulty]!)}
            </p>
          )}
          <p>{t.instructions}</p>
        </div>
      </div>
    </div>
  );
}
