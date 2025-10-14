'use client';

import { useState, useRef } from 'react';

export default function AudioRecorderStream() {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('Ready to record');
  const [isSupported, setIsSupported] = useState<boolean | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamControllerRef = useRef<ReadableStreamDefaultController | null>(null);

  // 브라우저가 ReadableStream body를 지원하는지 확인
  const checkSupport = async () => {
    try {
      const supportsRequestStreams =
        'body' in Request.prototype &&
        typeof ReadableStream !== 'undefined';

      setIsSupported(supportsRequestStreams);
      return supportsRequestStreams;
    } catch {
      setIsSupported(false);
      return false;
    }
  };

  const startRecording = async () => {
    // 브라우저 지원 확인
    const supported = await checkSupport();
    if (!supported) {
      setStatus('❌ This browser does not support streaming request bodies');
      return;
    }

    try {
      setStatus('Requesting microphone access...');
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // MediaRecorder 설정
      const mediaRecorder = new MediaRecorder(mediaStream, {
        mimeType: 'audio/webm',
      });

      mediaRecorderRef.current = mediaRecorder;

      // ReadableStream 생성
      const readableStream = new ReadableStream({
        start(controller) {
          streamControllerRef.current = controller;
          console.log('Stream started');
        },
        cancel() {
          console.log('Stream cancelled');
        }
      });

      // 오디오 청크가 준비될 때마다 스트림에 추가
      let chunkCount = 0;
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && streamControllerRef.current) {
          try {
            // Blob을 ArrayBuffer로 변환
            const arrayBuffer = await event.data.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);

            // 스트림에 청크 추가
            streamControllerRef.current.enqueue(uint8Array);
            chunkCount++;

            console.log(`Chunk ${chunkCount} enqueued: ${uint8Array.length} bytes`);
            setStatus(`Recording... Chunk ${chunkCount} sent (${uint8Array.length} bytes)`);
          } catch (error) {
            console.error('Error enqueuing chunk:', error);
          }
        }
      };

      mediaRecorder.onstart = () => {
        setIsRecording(true);
        setStatus('Recording with ReadableStream...');
      };

      mediaRecorder.onstop = () => {
        setIsRecording(false);

        // 스트림 종료
        if (streamControllerRef.current) {
          streamControllerRef.current.close();
          streamControllerRef.current = null;
        }

        mediaStream.getTracks().forEach((track) => track.stop());
        setStatus(`Recording stopped. Total chunks sent: ${chunkCount}`);
      };

      // Fetch로 스트림 전송 시작
      setStatus('Starting stream upload...');

      fetch('/api/audio-stream-readable', {
        method: 'POST',
        headers: {
          'Content-Type': 'audio/webm',
        },
        body: readableStream,
        // @ts-ignore - duplex는 아직 TypeScript에서 완전히 지원되지 않음
        duplex: 'half',
      })
        .then(response => response.json())
        .then(data => {
          console.log('Upload complete:', data);
          setStatus(`✅ Upload complete! Session: ${data.sessionId}, Chunks: ${data.totalChunks}`);
        })
        .catch(error => {
          console.error('Upload error:', error);
          setStatus(`❌ Upload error: ${error.message}`);
        });

      // 1초마다 청크 생성
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

  return (
    <div className="flex flex-col items-center gap-6 p-8 border-2 border-purple-300 rounded-lg bg-white shadow-lg">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold text-gray-800">Audio Streaming (ReadableStream)</h2>
        {isSupported === true && (
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-semibold">
            ✓ Supported
          </span>
        )}
        {isSupported === false && (
          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-semibold">
            ✗ Not Supported
          </span>
        )}
      </div>

      <div className="flex gap-4">
        <button
          onClick={startRecording}
          disabled={isRecording || isSupported === false}
          className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
            isRecording || isSupported === false
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-purple-500 hover:bg-purple-600'
          }`}
        >
          Start Streaming
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
          Stop Streaming
        </button>
      </div>

      <div className="w-full max-w-md">
        <div className="mb-2 text-sm text-gray-600">
          <span className="font-semibold">Status:</span>
          <div className="mt-1 p-2 bg-gray-50 rounded text-xs break-words">
            {status}
          </div>
        </div>
        {isRecording && (
          <div className="mt-4 flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">Streaming in progress...</span>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500 text-center max-w-md">
        <p className="font-semibold mb-1">How it works:</p>
        <p>Uses Fetch API with ReadableStream body to send audio chunks</p>
        <p>in real-time without waiting for the recording to finish.</p>
        <p className="mt-2 text-red-600">
          Note: Requires Chrome 95+ or compatible browser
        </p>
      </div>
    </div>
  );
}
