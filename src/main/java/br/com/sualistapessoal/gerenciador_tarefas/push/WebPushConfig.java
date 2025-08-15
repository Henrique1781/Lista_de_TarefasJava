package br.com.sualistapessoal.gerenciador_tarefas.push;

import nl.martijndwars.webpush.PushService;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import jakarta.annotation.PostConstruct;

import java.security.GeneralSecurityException;
import java.security.Security;

@Configuration
public class WebPushConfig {

    @Value("${vapid.public.key}")
    private String vapidPublicKey;
    @Value("${vapid.private.key}")
    private String vapidPrivateKey;
    @Value("${vapid.subject}")
    private String vapidSubject;

    @PostConstruct
    private void init() {
        Security.addProvider(new BouncyCastleProvider());
    }

    @Bean
    public PushService pushService() throws GeneralSecurityException {
        PushService pushService = new PushService();
        pushService.setPublicKey(vapidPublicKey);
        pushService.setPrivateKey(vapidPrivateKey);
        pushService.setSubject(vapidSubject);
        return pushService;
    }
}