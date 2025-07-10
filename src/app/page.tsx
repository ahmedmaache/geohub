"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ArrowRightLeft } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Genkit AI Flows
import { translateText } from "@/ai/flows/translate-text";
import { storeTranslationHistory } from "@/ai/flows/store-translation-history";

// Firebase
import { app, auth, db } from '@/lib/firebase';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore';

const languages: { [key: string]: string } = {
    'en-US': 'English (US)', 'es-ES': 'Spanish', 'fr-FR': 'French', 'de-DE': 'German',
    'it-IT': 'Italian', 'ja-JP': 'Japanese', 'ko-KR': 'Korean', 'pt-BR': 'Portuguese',
    'ru-RU': 'Russian', 'zh-CN': 'Chinese (Mandarin)', 'ar-SA': 'Arabic', 'hi-IN': 'Hindi'
};

type HistoryItem = {
    id: string;
    originalText: string;
    translatedText: string;
    sourceLanguage: string;
    targetLanguage: string;
    createdAt: Date;
};

export default function Home() {
    // Component State
    const [isTranslating, setIsTranslating] = useState(false);
    const [sourceLang, setSourceLang] = useState('en-US');
    const [targetLang, setTargetLang] = useState('es-ES');
    const [originalText, setOriginalText] = useState('');
    const [translatedText, setTranslatedText] = useState('');
    const [status, setStatus] = useState('Ready to translate.');
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [user, setUser] = useState<User | null>(null);

    // Refs for browser-specific objects
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    
    const { toast } = useToast();
    const appId = process.env.NEXT_PUBLIC_APP_ID || 'lingo-live-app';

    // Firebase Authentication Effect
    useEffect(() => {
        if (!auth) {
            setStatus("Firebase not configured. History is disabled.");
            return;
        }
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                signInAnonymously(auth).catch((error) => {
                    console.error("Anonymous sign-in error:", error);
                    setStatus("Authentication failed.");
                    toast({
                        variant: "destructive",
                        title: "Authentication Error",
                        description: "Could not sign in anonymously. History will not be saved.",
                    });
                });
            }
        });
        return () => unsubscribe();
    }, [toast]);

    // Firestore History Listener Effect
    useEffect(() => {
        if (user && db) {
            const historyCollectionRef = collection(db, `artifacts/${appId}/users/${user.uid}/translations`);
            const q = query(historyCollectionRef, orderBy('createdAt', 'desc'));

            const unsubscribe = onSnapshot(q, (snapshot) => {
                if (snapshot.empty) {
                    setHistory([]);
                    return;
                }
                const newHistory: HistoryItem[] = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        originalText: data.originalText,
                        translatedText: data.translatedText,
                        sourceLanguage: data.sourceLanguage,
                        targetLanguage: data.targetLanguage,
                        createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
                    };
                });
                setHistory(newHistory);
            }, (error) => {
                 console.error("Firestore listener error:", error);
                 setStatus("Error fetching history.");
            });

            return () => unsubscribe();
        }
    }, [user, appId]);

    // Main translation function
    const handleTranslate = async (textToTranslate: string) => {
        if (!textToTranslate) return;

        setStatus('Translating...');
        setTranslatedText('...');

        try {
            const result = await translateText({
                text: textToTranslate,
                sourceLangName: languages[sourceLang],
                targetLangName: languages[targetLang],
            });

            if (result.translatedText) {
                const finalTranslation = result.translatedText;
                setTranslatedText(finalTranslation);
                setStatus('Translation complete.');
                await saveToHistory(textToTranslate, finalTranslation);
            } else {
                throw new Error("No translation returned from AI.");
            }
        } catch (error) {
            console.error("Translation error:", error);
            const errorMessage = "Translation failed. Please try again.";
            setStatus(errorMessage);
            setTranslatedText('');
            toast({
                variant: "destructive",
                title: "Translation Error",
                description: (error as Error).message,
            });
        }
    };

    // Function to save translation to Firestore
    const saveToHistory = async (original: string, translated: string) => {
        if (!db || !user) {
            console.warn("Firestore or user not available. Skipping history save.");
            return;
        }
        
        const historyData = {
            originalText: original,
            translatedText: translated,
            sourceLanguage: sourceLang,
            targetLanguage: targetLang,
            userId: user.uid,
            appId: appId,
        };

        try {
            await storeTranslationHistory(historyData);
            
            const historyCollectionRef = collection(db, `artifacts/${appId}/users/${user.uid}/translations`);
            await addDoc(historyCollectionRef, {
                originalText: original,
                translatedText: translated,
                sourceLanguage: sourceLang,
                targetLanguage: targetLang,
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error saving to Firestore:", error);
            toast({
                variant: "destructive",
                title: "History Error",
                description: "Could not save translation to history.",
            });
        }
    };

    // Speech Recognition Logic
    const toggleTranslation = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setStatus("Speech recognition not supported in this browser.");
            toast({
                variant: "destructive",
                title: "Browser Not Supported",
                description: "Speech recognition is not available in your browser.",
            });
            return;
        }

        if (isTranslating && recognitionRef.current) {
            recognitionRef.current.stop();
            return;
        }

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;

        recognition.lang = sourceLang;
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = () => {
            setIsTranslating(true);
            setStatus('Listening...');
            setOriginalText('');
            setTranslatedText('');
        };

        recognition.onend = () => {
            setIsTranslating(false);
            setStatus('Click "Start" to begin.');
            recognitionRef.current = null;
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setStatus(`Error: ${event.error}`);
            toast({
                variant: "destructive",
                title: "Speech Recognition Error",
                description: `There was an error: ${event.error}`,
            });
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            
            setOriginalText(finalTranscript + interimTranscript);

            if (finalTranscript.trim()) {
                handleTranslate(finalTranscript.trim());
            }
        };

        recognition.start();
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <Card className="w-full max-w-4xl mx-auto shadow-2xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl md:text-4xl font-bold font-headline">Real-Time AI Translator</CardTitle>
                    <CardDescription className="mt-2">Speak into your microphone and see the translation instantly.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
                        <div className="flex flex-col">
                            <label htmlFor="source-lang-select" className="text-sm font-medium text-muted-foreground mb-1">From</label>
                            <Select value={sourceLang} onValueChange={setSourceLang} disabled={isTranslating}>
                                <SelectTrigger id="source-lang-select"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {Object.entries(languages).map(([code, name]) => (
                                        <SelectItem key={code} value={code}>{name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex justify-center items-end h-full">
                           <ArrowRightLeft className="text-muted-foreground h-6 w-6 mt-5" />
                        </div>
                        <div className="flex flex-col">
                            <label htmlFor="target-lang-select" className="text-sm font-medium text-muted-foreground mb-1">To</label>
                            <Select value={targetLang} onValueChange={setTargetLang} disabled={isTranslating}>
                                <SelectTrigger id="target-lang-select"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {Object.entries(languages).map(([code, name]) => (
                                        <SelectItem key={code} value={code}>{name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    <div className="text-center py-4">
                        <Button 
                            onClick={toggleTranslation}
                            size="lg"
                            className={cn(
                                "px-8 py-6 text-lg font-bold rounded-full transition-all duration-300 shadow-lg",
                                isTranslating ? "bg-red-600 hover:bg-red-700 pulse-animation" : "bg-primary hover:bg-primary/90"
                            )}
                        >
                            {isTranslating ? 'Stop Translating' : 'Start Translating'}
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-muted/50 p-4 rounded-lg border min-h-[150px]">
                            <h3 className="text-lg font-semibold text-foreground mb-2">Original Text</h3>
                            <p className="text-foreground text-lg min-h-[1.5em]">{originalText}</p>
                        </div>
                         <div className="bg-accent/10 p-4 rounded-lg border border-accent/20 min-h-[150px]">
                            <h3 className="text-lg font-semibold text-accent-foreground mb-2">Translated Text</h3>
                            <p className="text-accent-foreground text-lg font-medium min-h-[1.5em]">{translatedText}</p>
                        </div>
                    </div>

                    <div>
                        <div className="text-center text-muted-foreground h-6 mb-4 italic">{status}</div>
                         <Separator className="my-4" />
                        <h3 className="text-xl font-bold font-headline mb-4">Translation History</h3>
                        <ScrollArea className="h-64 w-full rounded-lg border p-4 bg-muted/30">
                           {history.length > 0 ? (
                                <div className="space-y-4">
                                    {history.map(item => (
                                        <div key={item.id} className="bg-card p-3 rounded-lg shadow-sm border">
                                            <p className="text-sm text-muted-foreground">{languages[item.sourceLanguage] || item.sourceLanguage} → {languages[item.targetLanguage] || item.targetLanguage}</p>
                                            <p className="font-medium text-card-foreground mt-1">"{item.originalText}"</p>
                                            <p className="font-semibold text-primary">"{item.translatedText}"</p>
                                            <p className="text-xs text-muted-foreground text-right mt-2">{item.createdAt.toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>
                           ) : (
                                <p className="text-muted-foreground text-center pt-8">Your saved translations will appear here.</p>
                           )}
                        </ScrollArea>
                    </div>
                </CardContent>
                <CardFooter className="text-center text-xs text-muted-foreground justify-center">
                    <p>User ID: <span className="font-mono">{user ? user.uid : "Not signed in"}</span></p>
                </CardFooter>
            </Card>
        </div>
    );
}
