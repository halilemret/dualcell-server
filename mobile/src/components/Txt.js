import React from 'react';
import { Text } from 'react-native';
import { colors, font } from '../theme';

export default function Txt({ weight = 'regular', style, ...props }) {
  return <Text {...props} style={[{ color: colors.text, fontFamily: font[weight] }, style]} />;
}
