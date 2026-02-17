import './Avatar.css';

/**
 * Avatar Component
 * Displays an animated AI avatar that reacts to speech
 * 
 * Props:
 * - isSpeaking: boolean - Whether the avatar is currently speaking
 */

interface AvatarProps {
  isSpeaking: boolean;
}

export default function Avatar({ isSpeaking }: AvatarProps) {
  return (
    <div className={`avatar-container ${isSpeaking ? 'speaking' : ''}`}>
      {/* Outer glow that appears when speaking */}
      {isSpeaking && <div className="avatar-glow"></div>}

      {/* Main avatar circle */}
      <div className="avatar-circle">
        <div className="avatar-ring ring-1" aria-hidden="true"></div>
        <div className="avatar-ring ring-2" aria-hidden="true"></div>
        <div className="avatar-core" aria-hidden="true">
          <div className="avatar-silhouette">
            <div className="avatar-head"></div>
            <div className="avatar-shoulders"></div>
          </div>
        </div>
      </div>

      {/* Animated pulse rings when speaking */}
      {isSpeaking && (
        <>
          <div className="pulse-ring pulse-ring-1"></div>
          <div className="pulse-ring pulse-ring-2"></div>
        </>
      )}
    </div>
  );
}
