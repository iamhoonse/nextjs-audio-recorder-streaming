import AudioRecorder from '@/components/AudioRecorder';

export default function Home() {
  return (
    <div className="font-sans flex items-center justify-center min-h-screen p-8 bg-gradient-to-br from-blue-50 to-indigo-100">
      <main className="flex flex-col gap-8 items-center">
        <div className="text-center mb-4">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Next.js Audio Streaming
          </h1>
          <p className="text-gray-600">
            Real-time audio recording with chunk-based HTTP streaming
          </p>
        </div>

        <AudioRecorder />

        <div className="mt-8 p-6 bg-white rounded-lg shadow-md max-w-2xl">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">How it works:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 text-sm">
            <li>MediaRecorder API captures audio from your microphone</li>
            <li>Audio is divided into 1-second chunks automatically</li>
            <li>Each chunk is sent to the server immediately via HTTP POST</li>
            <li>Server saves chunks in the <code className="bg-gray-100 px-2 py-1 rounded">uploads/</code> directory</li>
            <li>You can process or stream chunks to other services in real-time</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
