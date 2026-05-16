'use client'

import {
  useTracks,
  VideoTrack,
  AudioTrack,
  useLocalParticipant,
  useIsSpeaking,
  useIsMuted,
  useParticipantAttribute,
  isTrackReference,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import type { TrackReferenceOrPlaceholder } from '@livekit/components-react'

function MicOffBadge() {
  return (
    <div className="w-5 h-5 rounded-full bg-red-500/90 flex items-center justify-center flex-shrink-0">
      <svg width="9" height="9" viewBox="0 0 24 24" fill="white">
        <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
      </svg>
    </div>
  )
}

function VideoTile({
  trackRef,
  localSid,
}: {
  trackRef: TrackReferenceOrPlaceholder
  localSid: string
}) {
  const { participant } = trackRef
  const isLocal = participant.sid === localSid
  const speaking = useIsSpeaking(participant)
  const micMuted = useIsMuted({ participant, source: Track.Source.Microphone })
  // Reactively subscribe to away reason attribute set via localParticipant.setAttributes()
  const awayReason = useParticipantAttribute('awayReason', { participant })

  const hasVideo =
    isTrackReference(trackRef) &&
    trackRef.publication.isEnabled &&
    !trackRef.publication.isMuted

  const displayName = participant.name ?? participant.identity

  return (
    <div
      className={`relative rounded-2xl overflow-hidden bg-[#1C2333] flex items-center justify-center transition-all duration-150 ${
        speaking && !awayReason
          ? 'ring-2 ring-[#22C55E] shadow-[0_0_16px_rgba(34,197,94,0.25)]'
          : 'ring-1 ring-white/8'
      }`}
      style={{ aspectRatio: '16/9' }}
    >
      {hasVideo && !awayReason ? (
        <VideoTrack
          trackRef={trackRef as TrackReferenceOrPlaceholder & { publication: NonNullable<TrackReferenceOrPlaceholder['publication']> }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 p-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
            style={{ background: '#6366F122', border: '2px solid #6366F144', color: '#818CF8' }}
          >
            {displayName?.[0]?.toUpperCase() ?? '?'}
          </div>
          {!awayReason && (
            <p className="text-xs text-slate-400 font-medium truncate max-w-[120px]">
              {displayName}{isLocal ? ' (나)' : ''}
            </p>
          )}
        </div>
      )}

      {/* Away state overlay */}
      {awayReason && (
        <div className="absolute inset-0 bg-[#0D0F14]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 p-3">
          <span className="text-2xl">💤</span>
          <p className="text-sm font-bold text-white text-center leading-tight">{awayReason}</p>
          <p className="text-xs text-slate-500">잠시 자리 비움</p>
        </div>
      )}

      {/* Name + mic overlay (always visible at bottom) */}
      {!awayReason && (
        <div className="absolute bottom-0 left-0 right-0 p-2 flex items-end justify-between bg-gradient-to-t from-black/60 to-transparent">
          <span className="text-xs text-white font-medium truncate mr-1">
            {displayName}{isLocal ? ' (나)' : ''}
          </span>
          {micMuted && <MicOffBadge />}
        </div>
      )}

      {/* Away: still show name at bottom */}
      {awayReason && (
        <div className="absolute bottom-2 left-2">
          <span className="text-xs text-slate-500">{displayName}{isLocal ? ' (나)' : ''}</span>
        </div>
      )}
    </div>
  )
}

export function VideoGrid() {
  const { localParticipant } = useLocalParticipant()

  const cameraTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false },
  )

  const audioTracks = useTracks(
    [Track.Source.Microphone],
    { onlySubscribed: true },
  )

  const count = cameraTracks.length
  const gridCols =
    count <= 1 ? 'grid-cols-1'
    : count <= 2 ? 'grid-cols-2'
    : count <= 4 ? 'grid-cols-2'
    : count <= 6 ? 'grid-cols-3'
    : 'grid-cols-3'

  return (
    <div className="flex-1 overflow-y-auto p-3 min-h-0">
      {/* Invisible audio elements */}
      {audioTracks
        .filter((t) => isTrackReference(t) && t.participant.sid !== localParticipant.sid)
        .map((t) => (
          <AudioTrack
            key={`audio-${t.participant.sid}`}
            trackRef={t as TrackReferenceOrPlaceholder & { publication: NonNullable<TrackReferenceOrPlaceholder['publication']> }}
          />
        ))}

      <div className={`grid ${gridCols} gap-2 auto-rows-fr`}>
        {cameraTracks.map((trackRef) => (
          <VideoTile
            key={`cam-${trackRef.participant.sid}`}
            trackRef={trackRef}
            localSid={localParticipant.sid}
          />
        ))}
      </div>
    </div>
  )
}
