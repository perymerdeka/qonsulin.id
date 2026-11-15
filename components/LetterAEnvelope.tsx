type LetterAEnvelopeProps = {
  closed?: boolean;
  opening?: boolean;
  compact?: boolean;
};

export function LetterAEnvelope({ closed = false, opening = false, compact = false }: LetterAEnvelopeProps) {
  return (
    <div className={`letter-a-envelope${closed ? " is-closed" : ""}${opening ? " is-opening" : ""}${compact ? " is-compact" : ""}`} aria-hidden="true">
      <img
        className="letter-a-envelope-reference"
        src={closed ? "/member/letter-a/letter-a-closed.png" : "/member/letter-a/letter-a-reference.png"}
        width={540}
        height={closed ? 360 : 599}
        alt=""
      />
      {opening && <img className="letter-a-envelope-opening-cover" src="/member/letter-a/letter-a-closed.png" width={540} height={360} alt="" />}
    </div>
  );
}
