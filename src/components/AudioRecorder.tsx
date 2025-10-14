'use client';

import { useState, useRef } from 'react';

export default function AudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('Ready to record');
  const [chunksSent, setChunksSent] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const sessionIdRef = useRef<string>('');
  const chunkIndexRef = useRef(0);

  const startRecording = async () => {
    try {
      setStatus('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 세션 ID 생성 (타임스탬프 기반)
      sessionIdRef.current = `session_${Date.now()}`;
      chunkIndexRef.current = 0;
      setChunksSent(0);

      // MediaRecorder 설정
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      mediaRecorderRef.current = mediaRecorder;

      // 오디오 청크가 준비될 때마다 호출됨
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          await sendAudioChunk(event.data, chunkIndexRef.current);
          chunkIndexRef.current++;
        }
      };

      mediaRecorder.onstart = () => {
        setIsRecording(true);
        setStatus('Recording... Chunks will be sent every 1 second');
      };

      mediaRecorder.onstop = () => {
        setIsRecording(false);
        setStatus(`Recording stopped. Total chunks sent: ${chunkIndexRef.current}`);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.onerror = (error) => {
        console.error('MediaRecorder error:', error);
        setStatus('Error occurred during recording');
      };

      // 1000ms (1초)마다 청크 생성
      mediaRecorder.start(1000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      setStatus('Failed to access microphone. Please grant permission.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const sendAudioChunk = async (chunk: Blob, index: number) => {
    try {
      const formData = new FormData();
      formData.append('chunk', chunk);
      formData.append('index', index.toString());
      formData.append('sessionId', sessionIdRef.current);

      setStatus(`Sending chunk ${index}... (${chunk.size} bytes)`);

      const response = await fetch('/api/audio-stream', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Chunk sent successfully:', result);

      setChunksSent(prev => prev + 1);
      setStatus(`Recording... Chunk ${index} sent successfully`);

    } catch (error) {
      console.error('Error sending audio chunk:', error);
      setStatus(`Error sending chunk ${index}`);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 p-8 border-2 border-gray-300 rounded-lg bg-white shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800">Audio Streaming Recorder</h2>

      <div className="flex gap-4">
        <button
          onClick={startRecording}
          disabled={isRecording}
          className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
            isRecording
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          Start Recording
        </button>

        <button
          onClick={stopRecording}
          disabled={!isRecording}
          className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
            !isRecording
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-red-500 hover:bg-red-600'
          }`}
        >
          Stop Recording
        </button>
      </div>

      <div className="w-full max-w-md">
        <div className="mb-2 flex justify-between text-sm text-gray-600">
          <span>Status:</span>
          <span className="font-semibold">{status}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Chunks sent:</span>
          <span className="font-semibold text-blue-600">{chunksSent}</span>
        </div>
        {isRecording && (
          <div className="mt-4 flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">Recording in progress...</span>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500 text-center max-w-md">
        <p>This recorder captures audio in 1-second chunks and sends each chunk</p>
        <p>to the server immediately via HTTP POST requests.</p>
      </div>
    </div>
  );
}
