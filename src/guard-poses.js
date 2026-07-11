// Reusable ready/guard poses for stance cards. These are presentation and
// choreography data, not weapon restrictions: every weapon can be driven from
// every guard even when a particular pairing is deliberately awkward.

export const GUARD_POSES = {
  longpoint: {
    label:'Longpoint', tradition:'European', pose:{
      hold:[0.04,1.02,0.48], tip:[0.00,0.08,1.00], roll:0.02,
      twist:-0.02, pitch:-0.01, lean:0.00, hipTwist:-0.02,
      hip:[0,0,0.03], lower:0.035, head:[0.00,0.02]
    }
  },
  vomTagRight: {
    label:'Vom Tag (right)', tradition:'European', pose:{
      hold:[0.42,1.48,0.02], tip:[0.18,0.92,-0.35], roll:0.28,
      twist:0.30, pitch:-0.10, lean:0.14, hipTwist:0.20,
      hip:[0.04,0,-0.03], lower:0.01, head:[0.11,-0.08]
    }
  },
  vomTagLeft: {
    label:'Vom Tag (left)', tradition:'European', pose:{
      hold:[-0.40,1.46,0.02], tip:[-0.18,0.92,-0.35], roll:-0.28,
      twist:-0.30, pitch:-0.10, lean:-0.14, hipTwist:-0.20,
      hip:[-0.04,0,-0.03], lower:0.01, head:[-0.11,-0.08]
    }
  },
  ochsRight: {
    label:'Ochs (right)', tradition:'European', pose:{
      hold:[0.36,1.34,0.38], tip:[-0.14,0.10,0.98], roll:0.66,
      twist:0.24, pitch:-0.04, lean:0.10, hipTwist:0.13,
      hip:[0.03,0,0.02], lower:0.035, head:[0.08,0.00]
    }
  },
  ochsLeft: {
    label:'Ochs (left)', tradition:'European', pose:{
      hold:[-0.34,1.32,0.38], tip:[0.14,0.10,0.98], roll:-0.66,
      twist:-0.24, pitch:-0.04, lean:-0.10, hipTwist:-0.13,
      hip:[-0.03,0,0.02], lower:0.035, head:[-0.08,0.00]
    }
  },
  pflugRight: {
    label:'Pflug (right)', tradition:'European', pose:{
      hold:[0.30,0.76,0.35], tip:[-0.06,0.20,0.98], roll:0.30,
      twist:0.18, pitch:0.05, lean:0.07, hipTwist:0.12,
      hip:[0.03,0,0.02], lower:0.065, head:[0.05,0.04]
    }
  },
  pflugLeft: {
    label:'Pflug (left)', tradition:'European', pose:{
      hold:[-0.28,0.76,0.35], tip:[0.06,0.20,0.98], roll:-0.30,
      twist:-0.18, pitch:0.05, lean:-0.07, hipTwist:-0.12,
      hip:[-0.03,0,0.02], lower:0.065, head:[-0.05,0.04]
    }
  },
  alber: {
    label:'Alber', tradition:'European', pose:{
      hold:[0.02,0.66,0.43], tip:[0.00,-0.72,0.70], roll:0.00,
      twist:-0.03, pitch:0.12, lean:0.00, hipTwist:-0.02,
      hip:[0,0,0.02], lower:0.095, head:[0.00,0.09]
    }
  },
  nebenhutRight: {
    label:'Nebenhut (right)', tradition:'European', pose:{
      hold:[0.42,0.58,0.18], tip:[0.18,-0.46,0.87], roll:0.46,
      twist:0.28, pitch:0.12, lean:0.12, hipTwist:0.18,
      hip:[0.04,0,0.00], lower:0.10, head:[0.09,0.08]
    }
  },
  nebenhutLeft: {
    label:'Nebenhut (left)', tradition:'European', pose:{
      hold:[-0.40,0.58,0.18], tip:[-0.18,-0.46,0.87], roll:-0.46,
      twist:-0.28, pitch:0.12, lean:-0.12, hipTwist:-0.18,
      hip:[-0.04,0,0.00], lower:0.10, head:[-0.09,0.08]
    }
  },
  hangingRight: {
    label:'Hanging guard (right)', tradition:'European', pose:{
      hold:[0.36,1.42,0.36], tip:[-0.12,-0.22,0.97], roll:0.72,
      twist:0.20, pitch:-0.02, lean:0.10, hipTwist:0.12,
      hip:[0.03,0,0.02], lower:0.04, head:[0.07,0.02]
    }
  },
  postaDonna: {
    label:'Posta di Donna', tradition:'European', pose:{
      hold:[-0.44,1.38,-0.02], tip:[-0.28,0.82,-0.50], roll:-0.42,
      twist:-0.34, pitch:-0.08, lean:-0.16, hipTwist:-0.23,
      hip:[-0.05,0,-0.03], lower:0.02, head:[-0.12,-0.06]
    }
  },
  finestraRight: {
    label:'Posta di Finestra', tradition:'European', pose:{
      hold:[0.34,1.29,0.42], tip:[-0.10,0.16,0.98], roll:0.56,
      twist:0.20, pitch:-0.02, lean:0.08, hipTwist:0.12,
      hip:[0.03,0,0.02], lower:0.04, head:[0.07,0.01]
    }
  },
  chudan: {
    label:'Chudan-no-kamae', tradition:'Japanese', pose:{
      hold:[0.03,0.96,0.43], tip:[0.00,0.14,0.99], roll:0.02,
      twist:-0.04, pitch:0.01, lean:0.00, hipTwist:-0.03,
      hip:[0,0,0.03], lower:0.055, head:[0.00,0.03]
    }
  },
  jodan: {
    label:'Jodan-no-kamae', tradition:'Japanese', pose:{
      hold:[0.06,1.64,-0.02], tip:[0.00,0.86,-0.52], roll:0.04,
      twist:0.02, pitch:-0.13, lean:0.02, hipTwist:0.02,
      hip:[0,0,-0.04], lower:0.00, head:[0.01,-0.10]
    }
  },
  gedan: {
    label:'Gedan-no-kamae', tradition:'Japanese', pose:{
      hold:[0.02,0.72,0.40], tip:[0.00,-0.38,0.93], roll:0.01,
      twist:-0.03, pitch:0.08, lean:0.00, hipTwist:-0.02,
      hip:[0,0,0.02], lower:0.08, head:[0.00,0.06]
    }
  },
  hassoRight: {
    label:'Hasso-no-kamae', tradition:'Japanese', pose:{
      hold:[0.38,1.43,0.04], tip:[0.12,0.95,-0.29], roll:0.24,
      twist:0.27, pitch:-0.08, lean:0.12, hipTwist:0.18,
      hip:[0.04,0,-0.02], lower:0.02, head:[0.10,-0.06]
    }
  },
  wakiLeft: {
    label:'Waki-gamae', tradition:'Japanese', pose:{
      hold:[-0.34,0.68,0.02], tip:[-0.14,-0.10,-0.98], roll:-0.34,
      twist:-0.30, pitch:0.08, lean:-0.12, hipTwist:-0.20,
      hip:[-0.04,0,-0.02], lower:0.08, head:[-0.10,0.05]
    }
  }
};

export const DEFAULT_GUARD_ID = 'longpoint';

export function guardPoseFor(stanceOrId) {
  const id = typeof stanceOrId === 'string' ? stanceOrId : stanceOrId?.guardId;
  return (GUARD_POSES[id] || GUARD_POSES[DEFAULT_GUARD_ID]).pose;
}

