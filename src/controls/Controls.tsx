import styled from '@emotion/styled';
import { colors } from '../styles';

export const ControlName = styled.span`
  align-self: stretch;
  color: ${colors.comboLabel};
  flex: 1;
  font-size: 12px;
  line-height: 22px;
  margin-right: 4px;
`;

export const ControlValue = styled.span`
  color: ${colors.comboText};
  font-size: 12px;
`;
