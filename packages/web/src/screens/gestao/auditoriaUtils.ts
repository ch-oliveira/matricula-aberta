import type { NomeIcone } from '../../components/Icone';

export interface InfoAcaoAuditoria {
  label: string;
  classe: string;
  icone: NomeIcone;
}

export function formatarAcaoAuditoria(acao: string): InfoAcaoAuditoria {
  switch (acao) {
    case 'ALOCACAO_JUDICIAL':
      return { label: 'Alocação Judicial', classe: 'acao-judicial', icone: 'scale' };
    case 'AUTUACAO_JUDICIAL':
      return { label: 'Mandado Autuado', classe: 'acao-judicial', icone: 'file-text' };
    case 'BAIXA_PRESENCIAL':
      return { label: 'Matrícula Confirmada', classe: 'acao-ok', icone: 'check-circle' };
    case 'EXPIRACAO_AUTOMATICA':
      return { label: 'Expirou Comparecimento', classe: 'acao-alerta', icone: 'clock' };
    case 'CANCELAMENTO_PRESENCIAL':
      return { label: 'Cancelamento Presencial', classe: 'acao-perigo', icone: 'x' };
    case 'DESISTENCIA_VOLUNTARIA':
      return { label: 'Desistência Voluntária', classe: 'acao-perigo', icone: 'x' };
    case 'ATUALIZACAO_VAGAS':
      return { label: 'Vagas Atualizadas', classe: 'acao-info', icone: 'refresh' };
    case 'AUDITORIA_EXPORTADA':
      return { label: 'Exportação CSV', classe: 'acao-info', icone: 'file-text' };
    default:
      return { label: acao.replace(/_/g, ' '), classe: 'acao-info', icone: 'info' };
  }
}

