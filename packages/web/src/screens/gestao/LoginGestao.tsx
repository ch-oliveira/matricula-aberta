import { useId, useState, type FormEvent } from 'react';
import { Icone } from '../../components/Icone';
import type { Escola } from '../../domain/types';
import { vagasStore } from '../../services/vagasStore';
import { PALETTES } from '../../stickers/fun';
import { padlock, school } from '../../stickers/icons';
import { Sticker } from '../../stickers/Sticker';

export function LoginSecretaria({ onEntrar }: { onEntrar: () => void }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [autenticando, setAutenticando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const emailId = useId();
  const senhaId = useId();
  const erroId = useId();

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const emailLimpo = email.trim().toLowerCase();
    const senhaLimpa = senha.trim();

    if (!emailLimpo) {
      setErro('Informe o e-mail institucional ou usuário da Secretaria.');
      return;
    }
    if (!senhaLimpa) {
      setErro('Digite sua senha de acesso.');
      return;
    }

    setAutenticando(true);
    setErro(null);
    try {
      await vagasStore.autenticarGestao({
        perfil: 'secretaria',
        usuario: emailLimpo,
        senha: senhaLimpa,
      });
      onEntrar();
    } catch (err) {
      setErro(
        err instanceof Error
          ? err.message
          : 'Não foi possível validar suas credenciais no servidor da SEDUC.',
      );
    } finally {
      setAutenticando(false);
    }
  }

  return (
    <form className="login-card" onSubmit={enviar} noValidate>
      <div className="login-card-topo">
        <Sticker icon={padlock} palette={PALETTES.clay} loop={false} replayOnHover style={{ width: 56 }} />
        <span className="lp-tag">Acesso Restrito · SEDUC</span>
      </div>

      <h1>Secretaria de Educação</h1>
      <p className="legenda">
        Painel exclusivo de gestão, alocação de vagas e auditoria municipal de Patos - PB. Exige credenciais autorizadas.
      </p>

      <div className="campo">
        <label htmlFor={emailId}>E-mail institucional ou Usuário</label>
        <input
          id={emailId}
          name="username"
          type="email"
          autoComplete="username"
          required
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          enterKeyHint="next"
          placeholder="ex: secretaria@patos.pb.gov.br"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setErro(null);
          }}
          aria-describedby={erro ? erroId : undefined}
          aria-invalid={erro ? true : undefined}
        />
      </div>

      <div className="campo">
        <label htmlFor={senhaId}>Senha de acesso</label>
        <div className="campo-senha-container">
          <input
            id={senhaId}
            name="password"
            type={mostrarSenha ? 'text' : 'password'}
            autoComplete="current-password"
            required
            enterKeyHint="done"
            placeholder="••••••••"
            value={senha}
            onChange={(e) => {
              setSenha(e.target.value);
              setErro(null);
            }}
            aria-describedby={erro ? erroId : undefined}
            aria-invalid={erro ? true : undefined}
          />
          <button
            type="button"
            className="btn-olho"
            onClick={() => setMostrarSenha((v) => !v)}
            aria-label={mostrarSenha ? 'Ocultar senha' : 'Ver senha'}
            title={mostrarSenha ? 'Ocultar senha' : 'Ver senha'}
          >
            <Icone nome={mostrarSenha ? 'stop' : 'scale'} tamanho={16} />
          </button>
        </div>
      </div>

      {erro && (
        <p id={erroId} className="erro-campo" role="alert">
          <Icone nome="alert-triangle" tamanho={16} /> {erro}
        </p>
      )}

      <button type="submit" className="btn btn-primario btn-largo" disabled={autenticando}>
        {autenticando ? 'Autenticando na SEDUC…' : 'Entrar na Secretaria de Educação'}{' '}
        <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}

export function LoginUnidade({ escolas, onEntrar }: { escolas: Escola[]; onEntrar: (id: string) => void }) {
  const [escolaId, setEscolaId] = useState(escolas[0]?.id ?? '');
  const [gestor, setGestor] = useState('');
  const [pin, setPin] = useState('');
  const [mostrarPin, setMostrarPin] = useState(false);
  const [autenticando, setAutenticando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const selId = useId();
  const gestorId = useId();
  const pinId = useId();
  const erroId = useId();

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const idAlvo = escolaId || escolas[0]?.id;
    const gestorLimpo = gestor.trim();
    const pinLimpo = pin.trim();

    if (!idAlvo) {
      setErro('Selecione uma unidade escolar.');
      return;
    }
    if (!gestorLimpo) {
      setErro('Informe o e-mail ou matrícula funcional do gestor.');
      return;
    }
    if (!pinLimpo) {
      setErro('Informe o PIN de segurança da unidade escolar.');
      return;
    }

    setAutenticando(true);
    setErro(null);
    try {
      await vagasStore.autenticarGestao({
        perfil: 'unidade',
        escolaId: idAlvo,
        usuario: gestorLimpo,
        senha: pinLimpo,
      });
      onEntrar(idAlvo);
    } catch (err) {
      setErro(
        err instanceof Error
          ? err.message
          : 'PIN de segurança incorreto para esta unidade escolar.',
      );
    } finally {
      setAutenticando(false);
    }
  }

  return (
    <form className="login-card" onSubmit={enviar} noValidate>
      <div className="login-card-topo">
        <Sticker icon={school} palette={PALETTES.riso} loop={false} replayOnHover style={{ width: 56 }} />
        <span className="lp-tag">Acesso da Unidade Escolar</span>
      </div>

      <h1>Painel da Unidade Escolar</h1>
      <p className="legenda">
        Acesso restrito para gestão de vagas da creche ou escola e atendimento presencial com QR Code.
      </p>

      <div className="campo">
        <label htmlFor={selId}>Unidade escolar de Patos - PB</label>
        <select id={selId} name="unidade" value={escolaId} onChange={(e) => setEscolaId(e.target.value)}>
          {escolas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome} — {e.bairro}
            </option>
          ))}
        </select>
      </div>

      <div className="campo">
        <label htmlFor={gestorId}>E-mail institucional ou Matrícula do Gestor</label>
        <input
          id={gestorId}
          name="username"
          type="text"
          autoComplete="username"
          required
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          enterKeyHint="next"
          placeholder="ex: gestor@patos.pb.gov.br ou matrícula"
          value={gestor}
          onChange={(e) => {
            setGestor(e.target.value);
            setErro(null);
          }}
          aria-describedby={erro ? erroId : undefined}
          aria-invalid={erro ? true : undefined}
        />
      </div>

      <div className="campo">
        <label htmlFor={pinId}>PIN de segurança da Unidade</label>
        <div className="campo-senha-container">
          <input
            id={pinId}
            name="password"
            type={mostrarPin ? 'text' : 'password'}
            inputMode="numeric"
            autoComplete="current-password"
            required
            maxLength={12}
            enterKeyHint="done"
            placeholder="••••"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setErro(null);
            }}
            aria-describedby={erro ? erroId : undefined}
            aria-invalid={erro ? true : undefined}
          />
          <button
            type="button"
            className="btn-olho"
            onClick={() => setMostrarPin((v) => !v)}
            aria-label={mostrarPin ? 'Ocultar PIN' : 'Ver PIN'}
            title={mostrarPin ? 'Ocultar PIN' : 'Ver PIN'}
          >
            <Icone nome={mostrarPin ? 'stop' : 'scale'} tamanho={16} />
          </button>
        </div>
      </div>

      {erro && (
        <p id={erroId} className="erro-campo" role="alert">
          <Icone nome="alert-triangle" tamanho={16} /> {erro}
        </p>
      )}

      <button type="submit" className="btn btn-primario btn-largo" disabled={autenticando}>
        {autenticando ? 'Autenticando unidade…' : 'Entrar no painel da unidade'}{' '}
        <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}

