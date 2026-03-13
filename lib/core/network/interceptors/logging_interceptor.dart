import 'package:dio/dio.dart';
import 'package:getx_starter/core/utils/app_logger.dart';

/// A thin wrapper around Dio's [LogInterceptor] that pipes output
/// through [AppLogger] for consistent, structured log output.
class LoggingInterceptor extends Interceptor {
  static const _tag = 'DioHttp';

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    AppLogger.verbose('→ ${options.method} ${options.uri}', tag: _tag);
    handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    AppLogger.info(
      '← ${response.statusCode} ${response.requestOptions.method} '
      '${response.requestOptions.uri}',
      tag: _tag,
    );
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    AppLogger.error(
      '✗ ${err.response?.statusCode ?? err.type.name} '
      '${err.requestOptions.method} ${err.requestOptions.uri} '
      '— ${err.message}',
      tag: _tag,
    );
    handler.next(err);
  }
}
